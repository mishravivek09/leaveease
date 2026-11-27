import mongoose from "mongoose";
import LeaveApplication from "../models/LeaveApplication.js";
import LeaveBalance from "../models/LeaveBalance.js";
import LeaveType from "../models/LeaveType.js";
import Holiday from "../models/Holiday.js";
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import Role from "../models/Role.js";
import { AppError } from "../middleware/errorMiddleware.js";
import { notifyWorkflowTransition } from "./notificationService.js";

export function parseUtcDate(value) {
  if (!value) return null;
  const isoDate = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}

export async function calculateWorkingDays(startInput, endInput, weeklyOffs = [0, 6]) {
  const start = parseUtcDate(startInput);
  const end = parseUtcDate(endInput);

  if (!start || !end || start > end) {
    throw new AppError("Invalid date range", 400);
  }

  const holidays = await Holiday.find({
    holidayDate: { $gte: start, $lte: end },
    isOptional: false,
  }).lean();

  const holidaySet = new Set(
    holidays.map((h) => new Date(h.holidayDate).toISOString().slice(0, 10))
  );
  const weeklyOffSet = new Set(weeklyOffs);

  let noOfDays = 0;
  let excludedHolidays = 0;
  let excludedWeekends = 0;

  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const dayOfWeek = cursor.getUTCDay();
    const key = cursor.toISOString().slice(0, 10);

    if (weeklyOffSet.has(dayOfWeek)) {
      excludedWeekends += 1;
    } else if (holidaySet.has(key)) {
      excludedHolidays += 1;
    } else {
      noOfDays += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { noOfDays, excludedHolidays, excludedWeekends, start, end };
}

export async function initializeBalancesForEmployee(empId, year = new Date().getUTCFullYear()) {
  const leaveTypes = await LeaveType.find({ isActive: true }).lean();
  for (const lt of leaveTypes) {
    await LeaveBalance.updateOne(
      { empId, leaveTypeId: lt._id, year },
      {
        $setOnInsert: {
          empId,
          leaveTypeId: lt._id,
          year,
          allocated: lt.maxDaysPerYear,
          used: 0,
          remaining: lt.maxDaysPerYear,
          carriedForward: 0,
          carryForwardApplied: false,
        },
      },
      { upsert: true }
    );
  }
}

async function resolveFallbackApprover(dept) {
  if (dept?.hrApproverId) {
    const hr = await Employee.findById(dept.hrApproverId).lean();
    if (hr && hr.isActive) return hr;
  }
  const adminRole = await Role.findOne({ roleName: "Admin" }).lean();
  if (adminRole) {
    const admin = await Employee.findOne({ roleId: adminRole._id, isActive: true }).lean();
    if (admin) return admin;
  }
  return null;
}

export async function submitLeave(applicant, { leaveTypeId, startDate, endDate, reason }) {
  if (!mongoose.isValidObjectId(leaveTypeId)) {
    throw new AppError("Invalid leave type ID", 400);
  }
  if (!reason?.trim()) {
    throw new AppError("Reason is required", 400);
  }

  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, isActive: true }).lean();
  if (!leaveType) {
    throw new AppError("Leave type not found or inactive", 404);
  }

  const dept = await Department.findById(applicant.deptId?._id || applicant.deptId).lean();
  const weeklyOffs = dept?.weeklyOffs || [0, 6];
  const { noOfDays, start, end } = await calculateWorkingDays(startDate, endDate, weeklyOffs);

  if (noOfDays === 0) {
    throw new AppError("Selected range contains zero working days", 400);
  }

  const overlap = await LeaveApplication.findOne({
    empId: applicant._id,
    status: { $in: ["Pending Manager", "Pending HR", "Approved"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean();

  if (overlap) {
    throw new AppError("Leave dates overlap with an existing active or pending request", 400);
  }

  const year = start.getUTCFullYear();
  await initializeBalancesForEmployee(applicant._id, year);

  const balance = await LeaveBalance.findOne({
    empId: applicant._id,
    leaveTypeId: leaveType._id,
    year,
  }).lean();

  const pendingApps = await LeaveApplication.find({
    empId: applicant._id,
    leaveTypeId: leaveType._id,
    status: { $in: ["Pending Manager", "Pending HR"] },
    startDate: {
      $gte: new Date(Date.UTC(year, 0, 1)),
      $lte: new Date(Date.UTC(year, 11, 31)),
    },
  }).lean();

  const pendingDays = pendingApps.reduce((sum, app) => sum + (app.noOfDays || 0), 0);

  if (!balance || balance.remaining < noOfDays + pendingDays) {
    throw new AppError(
      `Insufficient ${leaveType.typeName} balance. Available: ${balance?.remaining ?? 0}, Pending: ${pendingDays}, Requested: ${noOfDays}`,
      400
    );
  }

  let initialStatus = "Pending Manager";
  let recipient = null;

  if (applicant.managerId) {
    recipient = await Employee.findById(applicant.managerId).lean();
  } else {
    initialStatus = "Pending HR";
    recipient = await resolveFallbackApprover(dept);
  }

  const actorRole = applicant.roleId?.roleName || "Employee";
  const leave = await LeaveApplication.create({
    empId: applicant._id,
    leaveTypeId: leaveType._id,
    startDate: start,
    endDate: end,
    noOfDays,
    reason: reason.trim(),
    status: initialStatus,
    appliedDate: new Date(),
    auditTrail: [
      {
        action: "Applied",
        fromStatus: null,
        toStatus: initialStatus,
        actorId: applicant._id,
        actorRole,
        remarks: "",
        timestamp: new Date(),
      },
    ],
  });

  if (recipient && recipient._id.toString() !== applicant._id.toString()) {
    await notifyWorkflowTransition({
      type: "LEAVE_APPLIED",
      message: `${applicant.name} applied for ${noOfDays} day(s) of ${leaveType.typeName} leave (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}).`,
      recipient,
      relatedLeaveId: leave._id,
      emailSubject: `Leave Request from ${applicant.name}`,
    });
  }

  return leave;
}

export async function decideLeave(leaveId, actor, { decision, remarks = "" }) {
  if (!mongoose.isValidObjectId(leaveId)) {
    throw new AppError("Invalid leave ID", 400);
  }
  if (!["Approved", "Rejected"].includes(decision)) {
    throw new AppError("Decision must be Approved or Rejected", 400);
  }
  if (decision === "Rejected" && !remarks.trim()) {
    throw new AppError("Remarks are required when rejecting a leave request", 400);
  }

  const leave = await LeaveApplication.findById(leaveId)
    .populate({
      path: "empId",
      select: "name email managerId deptId",
      populate: { path: "deptId", select: "deptName approvalMode hrApproverId" },
    })
    .populate("leaveTypeId", "typeName");

  if (!leave) {
    throw new AppError("Leave application not found", 404);
  }

  if (leave.empId._id.toString() === actor.id) {
    throw new AppError("You cannot approve or reject your own leave application", 403);
  }

  if (!["Pending Manager", "Pending HR"].includes(leave.status)) {
    throw new AppError(`Leave is already ${leave.status}`, 409);
  }

  const dept = leave.empId.deptId;
  const isAdmin = actor.roleName === "Admin";

  if (leave.status === "Pending Manager") {
    const isAssignedManager = leave.empId.managerId?.toString() === actor.id;
    if (!isAssignedManager && !isAdmin) {
      throw new AppError("Only the assigned manager or Admin can decide this stage", 403);
    }
  } else if (leave.status === "Pending HR") {
    const isDesignatedHr = dept?.hrApproverId?.toString() === actor.id;
    const isHrRoleFallback = actor.roleName === "HR" && (!dept?.hrApproverId || isDesignatedHr);
    if (!isDesignatedHr && !isHrRoleFallback && !isAdmin) {
      throw new AppError("Only the designated HR approver or Admin can decide this stage", 403);
    }
  }

  const fromStatus = leave.status;
  let toStatus = decision;
  let action = decision;

  if (decision === "Approved" && fromStatus === "Pending Manager" && dept?.approvalMode === "multi") {
    toStatus = "Pending HR";
    action = "Manager Approved";
  }

  const auditEntry = {
    action,
    fromStatus,
    toStatus,
    actorId: actor.id,
    actorRole: actor.roleName,
    remarks: remarks.trim(),
    timestamp: new Date(),
  };

  let updated;
  if (toStatus === "Approved") {
    updated = await LeaveApplication.findOneAndUpdate(
      { _id: leave._id, status: fromStatus },
      {
        $set: { status: "Approved", approvedBy: actor.id },
        $push: { auditTrail: auditEntry },
      },
      { new: true }
    );
    if (!updated) {
      throw new AppError("Leave state changed concurrently, please retry", 409);
    }

    const year = new Date(leave.startDate).getUTCFullYear();
    const balanceUpdate = await LeaveBalance.findOneAndUpdate(
      {
        empId: leave.empId._id,
        leaveTypeId: leave.leaveTypeId._id,
        year,
        remaining: { $gte: leave.noOfDays },
      },
      {
        $inc: { used: leave.noOfDays, remaining: -leave.noOfDays },
      },
      { new: true }
    );

    if (!balanceUpdate) {
      await LeaveApplication.findByIdAndUpdate(leave._id, {
        $set: { status: fromStatus, approvedBy: null },
        $pop: { auditTrail: 1 },
      });
      throw new AppError("Insufficient leave balance to finalize approval", 400);
    }
  } else {
    updated = await LeaveApplication.findOneAndUpdate(
      { _id: leave._id, status: fromStatus },
      {
        $set: { status: toStatus },
        $push: { auditTrail: auditEntry },
      },
      { new: true }
    );
    if (!updated) {
      throw new AppError("Leave state changed concurrently, please retry", 409);
    }
  }

  if (toStatus === "Pending HR") {
    const hrRecipient = await resolveFallbackApprover(dept);
    if (hrRecipient) {
      await notifyWorkflowTransition({
        type: "LEAVE_FORWARDED",
        message: `${leave.empId.name}'s ${leave.leaveTypeId.typeName} leave (${leave.noOfDays} day(s)) was approved by Manager and awaits HR approval.`,
        recipient: hrRecipient,
        relatedLeaveId: leave._id,
        emailSubject: `HR Approval Needed: ${leave.empId.name}`,
      });
    }
  } else {
    await notifyWorkflowTransition({
      type: toStatus === "Approved" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      message: `Your ${leave.leaveTypeId.typeName} leave (${leave.noOfDays} day(s)) has been ${toStatus.toLowerCase()}.${remarks.trim() ? ` Remarks: ${remarks.trim()}` : ""}`,
      recipient: leave.empId,
      relatedLeaveId: leave._id,
      emailSubject: `Leave Request ${toStatus}`,
    });
  }

  return updated;
}

export async function cancelLeave(leaveId, actor) {
  if (!mongoose.isValidObjectId(leaveId)) {
    throw new AppError("Invalid leave ID", 400);
  }

  const leave = await LeaveApplication.findById(leaveId).populate("leaveTypeId", "typeName");
  if (!leave) {
    throw new AppError("Leave application not found", 404);
  }

  if (leave.empId.toString() !== actor.id) {
    throw new AppError("You can only cancel your own leave application", 403);
  }

  if (!["Pending Manager", "Pending HR"].includes(leave.status)) {
    throw new AppError(`Cannot cancel a leave that is ${leave.status}`, 409);
  }

  const fromStatus = leave.status;
  leave.status = "Cancelled";
  leave.auditTrail.push({
    action: "Cancelled",
    fromStatus,
    toStatus: "Cancelled",
    actorId: actor.id,
    actorRole: actor.roleName,
    remarks: "Cancelled by applicant",
    timestamp: new Date(),
  });

  await leave.save();
  return leave;
}

export async function runYearEndCarryForward(fromYear, toYear) {
  const fromY = Number(fromYear);
  const toY = Number(toYear);

  if (!Number.isInteger(fromY) || !Number.isInteger(toY) || toY !== fromY + 1) {
    throw new AppError("toYear must be fromYear + 1", 400);
  }

  const leaveTypes = await LeaveType.find({
    isActive: true,
    carryForwardAllowed: true,
  }).lean();

  const employees = await Employee.find({ isActive: true }).lean();
  let processedCount = 0;
  let skippedCount = 0;

  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const fromBal = await LeaveBalance.findOne({
        empId: emp._id,
        leaveTypeId: lt._id,
        year: fromY,
      }).lean();

      await LeaveBalance.updateOne(
        { empId: emp._id, leaveTypeId: lt._id, year: toY },
        {
          $setOnInsert: {
            empId: emp._id,
            leaveTypeId: lt._id,
            year: toY,
            allocated: lt.maxDaysPerYear,
            used: 0,
            remaining: lt.maxDaysPerYear,
            carriedForward: 0,
            carryForwardApplied: false,
          },
        },
        { upsert: true }
      );

      const carry = Math.min(fromBal?.remaining || 0, lt.maxCarryForwardDays || 0);
      const updated = await LeaveBalance.findOneAndUpdate(
        {
          empId: emp._id,
          leaveTypeId: lt._id,
          year: toY,
          carryForwardApplied: false,
        },
        {
          $inc: { carriedForward: carry, remaining: carry },
          $set: { carryForwardApplied: true },
        },
        { new: true }
      );

      if (updated) {
        processedCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  }

  return { processedCount, skippedCount, fromYear: fromY, toYear: toY };
}
