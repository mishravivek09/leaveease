import jwt from "jsonwebtoken";
import Employee from "../models/Employee.js";

const MUST_CHANGE_ALLOWLIST = ["/api/auth/me", "/api/users/change-password"];

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const employee = await Employee.findById(decoded.id)
    .select("-passwordHash")
    .populate("roleId", "roleName")
    .populate("deptId", "deptName approvalMode hrApproverId weeklyOffs");

  if (!employee) {
    return res.status(401).json({ message: "Employee account not found" });
  }

  if (!employee.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  if (
    employee.mustChangePassword &&
    !MUST_CHANGE_ALLOWLIST.some((path) => req.originalUrl.startsWith(path))
  ) {
    return res.status(403).json({
      message: "Password change required before accessing this resource",
      code: "MUST_CHANGE_PASSWORD",
    });
  }

  req.user = {
    id: employee._id.toString(),
    roleName: employee.roleId?.roleName || "Employee",
    deptId: employee.deptId?._id?.toString() || null,
    employee,
  };

  next();
};
