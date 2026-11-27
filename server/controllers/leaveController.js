import LeaveApplication from "../models/LeaveApplication.js";
import Department from "../models/Department.js";
import Employee from "../models/Employee.js";
import {
  calculateWorkingDays,
  submitLeave,
  decideLeave as decideLeaveWorkflow,
  cancelLeave as cancelLeaveWorkflow,
} from "../services/leaveService.js";

export const previewWorkingDays = async (req, res) => {
  const { startDate, endDate } = req.query;
  const dept = req.user.deptId ? await Department.findById(req.user.deptId).lean() : null;
  const result = await calculateWorkingDays(startDate, endDate, dept?.weeklyOffs || [0, 6]);
  res.json({
    noOfDays: result.noOfDays,
    excludedHolidays: result.excludedHolidays,
    excludedWeekends: result.excludedWeekends,
  });
};

export const applyLeave = async (req, res) => {
  const leaveApplication = await submitLeave(req.user.employee, req.body);
  res.status(201).json({ leaveApplication });
};

export const getMyLeaves = async (req, res) => {
  const filter = { empId: req.user.id };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const leaves = await LeaveApplication.find(filter)
    .populate("empId", "name email")
    .populate("leaveTypeId", "typeName")
    .populate("approvedBy", "name")
    .populate("auditTrail.actorId", "name")
    .sort({ appliedDate: -1 });

  res.json(leaves);
};

export const getMyStats = async (req, res) => {
  const empId = req.user.id;
  const [total, approved, pending, rejected, cancelled] = await Promise.all([
    LeaveApplication.countDocuments({ empId }),
    LeaveApplication.countDocuments({ empId, status: "Approved" }),
    LeaveApplication.countDocuments({ empId, status: { $in: ["Pending Manager", "Pending HR"] } }),
    LeaveApplication.countDocuments({ empId, status: "Rejected" }),
    LeaveApplication.countDocuments({ empId, status: "Cancelled" }),
  ]);

  res.json({ total, approved, pending, rejected, cancelled });
};

export const getAllStats = async (req, res) => {
  const [total, pending, approved, rejected] = await Promise.all([
    LeaveApplication.countDocuments(),
    LeaveApplication.countDocuments({ status: { $in: ["Pending Manager", "Pending HR"] } }),
    LeaveApplication.countDocuments({ status: "Approved" }),
    LeaveApplication.countDocuments({ status: "Rejected" }),
  ]);

  res.json({ total, pending, approved, rejected });
};

export const getCalendarData = async (req, res) => {
  const leaves = await LeaveApplication.find({ empId: req.user.id })
    .populate("leaveTypeId", "typeName")
    .lean();

  res.json(
    leaves.map((l) => ({
      startDate: l.startDate,
      endDate: l.endDate,
      status: l.status,
      noOfDays: l.noOfDays,
      leaveTypeId: l.leaveTypeId,
    }))
  );
};

export const getTeamLeaves = async (req, res) => {
  const hrDepts = await Department.find({ hrApproverId: req.user.id }).select("_id").lean();
  const hrDeptIds = hrDepts.map((d) => d._id);

  const empOr = [{ managerId: req.user.id }];
  if (hrDeptIds.length > 0) {
    empOr.push({ deptId: { $in: hrDeptIds } });
  }
  if (req.user.roleName === "HR" && req.user.deptId) {
    empOr.push({ deptId: req.user.deptId });
  }

  const teamEmployees = await Employee.find({ $or: empOr }).select("_id").lean();
  const teamIds = teamEmployees
    .map((e) => e._id)
    .filter((id) => id.toString() !== req.user.id);

  const filter = { empId: { $in: teamIds } };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const leaves = await LeaveApplication.find(filter)
    .populate({
      path: "empId",
      select: "name email deptId managerId",
      populate: { path: "deptId", select: "deptName approvalMode" },
    })
    .populate("leaveTypeId", "typeName")
    .populate("approvedBy", "name")
    .populate("auditTrail.actorId", "name")
    .sort({ appliedDate: -1 });

  res.json(leaves);
};

export const getAllLeaves = async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.deptId) {
    const deptEmps = await Employee.find({ deptId: req.query.deptId }).select("_id").lean();
    filter.empId = { $in: deptEmps.map((e) => e._id) };
  }

  const leaves = await LeaveApplication.find(filter)
    .populate({
      path: "empId",
      select: "name email deptId",
      populate: { path: "deptId", select: "deptName approvalMode" },
    })
    .populate("leaveTypeId", "typeName")
    .populate("approvedBy", "name")
    .populate("auditTrail.actorId", "name")
    .sort({ appliedDate: -1 });

  res.json(leaves);
};

export const decideLeave = async (req, res) => {
  const leaveApplication = await decideLeaveWorkflow(req.params.id, req.user, req.body);
  res.json({ message: "Leave updated", leaveApplication });
};

export const cancelLeave = async (req, res) => {
  const leaveApplication = await cancelLeaveWorkflow(req.params.id, req.user);
  res.json({ message: "Leave cancelled", leaveApplication });
};
