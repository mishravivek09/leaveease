import bcrypt from "bcryptjs";
import Employee from "../models/Employee.js";
import { generateToken } from "../utils/token.js";
import { AppError } from "../middleware/errorMiddleware.js";

export const register = async (_req, _res) => {
  throw new AppError("Self-registration disabled; contact Admin", 403);
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const employee = await Employee.findOne({ email: email.trim().toLowerCase() })
    .populate("roleId", "roleName")
    .populate("deptId", "deptName approvalMode hrApproverId weeklyOffs");

  if (!employee) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!employee.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  const isMatch = await bcrypt.compare(password, employee.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken(employee);
  const safeEmployee = employee.toObject();
  delete safeEmployee.passwordHash;

  res.json({ token, employee: safeEmployee });
};

export const getMe = async (req, res) => {
  res.json({ employee: req.user.employee });
};
