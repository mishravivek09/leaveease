import bcrypt from "bcryptjs";
import Employee from "../models/Employee.js";
import LeaveBalance from "../models/LeaveBalance.js";
import { AppError } from "../middleware/errorMiddleware.js";
import { initializeBalancesForEmployee } from "../services/leaveService.js";

export const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  if (!name?.trim() || !email?.trim()) {
    throw new AppError("Name and email are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await Employee.findOne({
    email: normalizedEmail,
    _id: { $ne: req.user.id },
  }).lean();

  if (existing) {
    throw new AppError("Email is already in use", 409);
  }

  const updated = await Employee.findByIdAndUpdate(
    req.user.id,
    { $set: { name: name.trim(), email: normalizedEmail } },
    { new: true, runValidators: true }
  )
    .select("-passwordHash")
    .populate("roleId", "roleName")
    .populate("deptId", "deptName approvalMode hrApproverId weeklyOffs");

  if (!updated) {
    throw new AppError("Employee not found", 404);
  }

  res.json({ employee: updated });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current and new passwords are required", 400);
  }

  if (newPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  const employee = await Employee.findById(req.user.id);
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, employee.passwordHash);
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 401);
  }

  employee.passwordHash = await bcrypt.hash(newPassword, 10);
  employee.mustChangePassword = false;
  await employee.save();

  res.json({ message: "Password updated successfully" });
};

export const getMyBalances = async (req, res) => {
  const year = Number(req.query.year || new Date().getUTCFullYear());
  await initializeBalancesForEmployee(req.user.id, year);

  const balances = await LeaveBalance.find({ empId: req.user.id, year })
    .populate("leaveTypeId", "typeName maxDaysPerYear carryForwardAllowed")
    .lean();

  res.json(balances);
};
