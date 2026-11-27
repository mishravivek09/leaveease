import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import Role from "../models/Role.js";
import LeaveType from "../models/LeaveType.js";
import Holiday from "../models/Holiday.js";
import { AppError } from "../middleware/errorMiddleware.js";
import {
  initializeBalancesForEmployee,
  parseUtcDate,
  runYearEndCarryForward,
} from "../services/leaveService.js";
import { sendEmailFireAndForget } from "../services/notificationService.js";

// --- Employees ---
export const getAllUsers = async (_req, res) => {
  const users = await Employee.find()
    .select("-passwordHash")
    .populate("roleId", "roleName")
    .populate("deptId", "deptName approvalMode")
    .populate("managerId", "name email")
    .sort({ createdAt: -1 });
  res.json(users);
};

export const inviteUser = async (req, res) => {
  const { name, email, doj, deptId, roleId, managerId } = req.body;

  if (!name?.trim() || !email?.trim() || !doj || !deptId || !roleId) {
    throw new AppError("name, email, doj, deptId, and roleId are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await Employee.findOne({ email: normalizedEmail }).lean();
  if (exists) {
    throw new AppError("An employee with this email already exists", 409);
  }

  const [dept, role] = await Promise.all([
    Department.findById(deptId).lean(),
    Role.findById(roleId).lean(),
  ]);
  if (!dept) throw new AppError("Department not found", 404);
  if (!role) throw new AppError("Role not found", 404);

  const parsedDoj = parseUtcDate(doj);
  if (!parsedDoj) throw new AppError("Invalid date of joining", 400);

  const tempPassword = crypto.randomBytes(9).toString("base64url").slice(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const created = await Employee.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    doj: parsedDoj,
    deptId,
    roleId,
    managerId: managerId || null,
    isActive: true,
    mustChangePassword: true,
  });

  await initializeBalancesForEmployee(created._id, new Date().getUTCFullYear());

  sendEmailFireAndForget({
    to: created.email,
    subject: "Welcome to LeaveEase : Account Invited",
    text: `Hello ${created.name}, your account has been created. Temporary password: ${tempPassword}. Please change it on first login.`,
  });

  const employee = await Employee.findById(created._id)
    .select("-passwordHash")
    .populate("roleId", "roleName")
    .populate("deptId", "deptName")
    .populate("managerId", "name email");

  res.status(201).json({ employee, tempPassword });
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid employee ID", 400);

  const employee = await Employee.findById(id);
  if (!employee) throw new AppError("Employee not found", 404);

  const { name, email, doj, deptId, roleId, managerId, isActive } = req.body;

  if (typeof isActive === "boolean" && !isActive) {
    if (id === req.user.id) {
      throw new AppError("You cannot deactivate your own account", 400);
    }
    const [directReports, hrDepts] = await Promise.all([
      Employee.countDocuments({ managerId: id, isActive: true }),
      Department.countDocuments({ hrApproverId: id }),
    ]);
    if (directReports > 0 || hrDepts > 0) {
      throw new AppError(
        "Reassign direct reports or department HR approver before deactivating this employee",
        400
      );
    }
    employee.isActive = false;
  } else if (typeof isActive === "boolean") {
    employee.isActive = isActive;
  }

  if (name?.trim()) employee.name = name.trim();
  if (email?.trim()) employee.email = email.trim().toLowerCase();
  if (doj) {
    const parsed = parseUtcDate(doj);
    if (!parsed) throw new AppError("Invalid date of joining", 400);
    employee.doj = parsed;
  }
  if (deptId) employee.deptId = deptId;
  if (roleId) employee.roleId = roleId;
  if (managerId !== undefined) {
    if (managerId === id) throw new AppError("Employee cannot be their own manager", 400);
    employee.managerId = managerId || null;
  }

  await employee.save();

  const populated = await Employee.findById(id)
    .select("-passwordHash")
    .populate("roleId", "roleName")
    .populate("deptId", "deptName")
    .populate("managerId", "name email");

  res.json({ employee: populated });
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid employee ID", 400);
  if (id === req.user.id) {
    throw new AppError("You cannot delete your own account", 400);
  }

  const [directReports, hrDepts] = await Promise.all([
    Employee.countDocuments({ managerId: id }),
    Department.countDocuments({ hrApproverId: id }),
  ]);
  if (directReports > 0 || hrDepts > 0) {
    throw new AppError(
      "Reassign direct reports or department HR approver before deleting this employee",
      400
    );
  }

  const deleted = await Employee.findByIdAndDelete(id);
  if (!deleted) throw new AppError("Employee not found", 404);

  res.json({ message: "Employee deleted" });
};

// --- Roles ---
export const getRoles = async (_req, res) => {
  const roles = await Role.find().sort({ roleName: 1 }).lean();
  res.json(roles);
};

// --- Departments ---
export const getDepartments = async (_req, res) => {
  const depts = await Department.find()
    .populate("hrApproverId", "name email")
    .sort({ deptName: 1 })
    .lean();
  res.json(depts);
};

export const createDepartment = async (req, res) => {
  const { deptName, approvalMode = "single", hrApproverId = null, weeklyOffs = [0, 6] } = req.body;
  if (approvalMode === "multi" && !hrApproverId) {
    throw new AppError("hrApproverId is required when approvalMode is multi", 400);
  }

  const dept = await Department.create({
    deptName,
    approvalMode,
    hrApproverId: hrApproverId || null,
    weeklyOffs,
  });
  res.status(201).json(dept);
};

export const updateDepartment = async (req, res) => {
  const { deptName, approvalMode, hrApproverId, weeklyOffs } = req.body;
  if (approvalMode === "multi" && !hrApproverId) {
    throw new AppError("hrApproverId is required when approvalMode is multi", 400);
  }

  const dept = await Department.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        ...(deptName ? { deptName } : {}),
        ...(approvalMode ? { approvalMode } : {}),
        ...(hrApproverId !== undefined ? { hrApproverId: hrApproverId || null } : {}),
        ...(weeklyOffs ? { weeklyOffs } : {}),
      },
    },
    { new: true, runValidators: true }
  ).populate("hrApproverId", "name email");

  if (!dept) throw new AppError("Department not found", 404);
  res.json(dept);
};

export const deleteDepartment = async (req, res) => {
  const assignedCount = await Employee.countDocuments({ deptId: req.params.id });
  if (assignedCount > 0) {
    throw new AppError("Cannot delete a department with assigned employees", 400);
  }
  const deleted = await Department.findByIdAndDelete(req.params.id);
  if (!deleted) throw new AppError("Department not found", 404);
  res.json({ message: "Department deleted" });
};

// --- Leave Types ---
export const getLeaveTypes = async (_req, res) => {
  const types = await LeaveType.find().sort({ typeName: 1 }).lean();
  res.json(types);
};

export const createLeaveType = async (req, res) => {
  const lt = await LeaveType.create(req.body);
  res.status(201).json(lt);
};

export const updateLeaveType = async (req, res) => {
  const lt = await LeaveType.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!lt) throw new AppError("Leave type not found", 404);
  res.json(lt);
};

export const deleteLeaveType = async (req, res) => {
  const deleted = await LeaveType.findByIdAndDelete(req.params.id);
  if (!deleted) throw new AppError("Leave type not found", 404);
  res.json({ message: "Leave type deleted" });
};

// --- Holidays ---
export const getHolidays = async (_req, res) => {
  const holidays = await Holiday.find().sort({ holidayDate: 1 }).lean();
  res.json(holidays);
};

export const createHoliday = async (req, res) => {
  const { holidayDate, description, isOptional = false } = req.body;
  const parsed = parseUtcDate(holidayDate);
  if (!parsed) throw new AppError("Invalid holidayDate", 400);

  const holiday = await Holiday.create({
    holidayDate: parsed,
    description,
    isOptional: Boolean(isOptional),
  });
  res.status(201).json(holiday);
};

export const updateHoliday = async (req, res) => {
  const update = { ...req.body };
  if (update.holidayDate) {
    const parsed = parseUtcDate(update.holidayDate);
    if (!parsed) throw new AppError("Invalid holidayDate", 400);
    update.holidayDate = parsed;
  }

  const holiday = await Holiday.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!holiday) throw new AppError("Holiday not found", 404);
  res.json(holiday);
};

export const deleteHoliday = async (req, res) => {
  const deleted = await Holiday.findByIdAndDelete(req.params.id);
  if (!deleted) throw new AppError("Holiday not found", 404);
  res.json({ message: "Holiday deleted" });
};

// --- Year-End Carry-Forward ---
export const triggerCarryForward = async (req, res) => {
  const { fromYear, toYear } = req.body;
  const result = await runYearEndCarryForward(fromYear, toYear);
  res.json(result);
};
