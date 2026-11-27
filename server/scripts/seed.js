import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Role from "../models/Role.js";
import Department from "../models/Department.js";
import LeaveType from "../models/LeaveType.js";
import Holiday from "../models/Holiday.js";
import Employee from "../models/Employee.js";
import LeaveBalance from "../models/LeaveBalance.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Notification from "../models/Notification.js";
import { initializeBalancesForEmployee, parseUtcDate } from "../services/leaveService.js";

dotenv.config();

async function seed() {
  await connectDB();

  if (process.argv.includes("--if-empty")) {
    const existingRoles = await Role.countDocuments();
    if (existingRoles > 0) {
      console.log("Database already seeded (--if-empty); skipping seed.");
      await mongoose.disconnect();
      return;
    }
  }

  // Drop legacy prototype collections if present
  const existingCollections = await mongoose.connection.db.listCollections().toArray();
  const names = new Set(existingCollections.map((c) => c.name));
  if (names.has("users")) await mongoose.connection.db.dropCollection("users");
  if (names.has("leaves")) await mongoose.connection.db.dropCollection("leaves");

  await Promise.all([
    Role.deleteMany({}),
    Department.deleteMany({}),
    LeaveType.deleteMany({}),
    Holiday.deleteMany({}),
    Employee.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveApplication.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const [empRole, mgrRole, hrRole, adminRole] = await Role.insertMany([
    { roleName: "Employee" },
    { roleName: "Manager" },
    { roleName: "HR" },
    { roleName: "Admin" },
  ]);

  const [engDept, opsDept] = await Department.insertMany([
    { deptName: "Engineering", approvalMode: "multi", weeklyOffs: [0, 6] },
    { deptName: "Operations", approvalMode: "single", weeklyOffs: [0, 6] },
  ]);

  await LeaveType.insertMany([
    { typeName: "Casual", maxDaysPerYear: 12, carryForwardAllowed: false, maxCarryForwardDays: 0 },
    { typeName: "Earned", maxDaysPerYear: 15, carryForwardAllowed: true, maxCarryForwardDays: 10 },
    { typeName: "Sick", maxDaysPerYear: 10, carryForwardAllowed: false, maxCarryForwardDays: 0 },
    { typeName: "Maternity", maxDaysPerYear: 90, carryForwardAllowed: false, maxCarryForwardDays: 0 },
  ]);

  const year = new Date().getUTCFullYear();
  await Holiday.insertMany([
    { holidayDate: parseUtcDate(`${year}-01-26`), description: "Republic Day", isOptional: false },
    { holidayDate: parseUtcDate(`${year}-08-15`), description: "Independence Day", isOptional: false },
    { holidayDate: parseUtcDate(`${year}-10-02`), description: "Gandhi Jayanti", isOptional: false },
    { holidayDate: parseUtcDate(`${year}-12-25`), description: "Christmas Day", isOptional: false },
  ]);

  const passwordHash = await bcrypt.hash("Demo@1234", 10);
  const doj = parseUtcDate(`${year - 1}-04-01`);

  const admin = await Employee.create({
    name: "Asha Admin",
    email: "admin@leaveease.local",
    passwordHash,
    doj,
    deptId: opsDept._id,
    roleId: adminRole._id,
    managerId: null,
  });

  const hr = await Employee.create({
    name: "Harish HR",
    email: "hr@leaveease.local",
    passwordHash,
    doj,
    deptId: engDept._id,
    roleId: hrRole._id,
    managerId: admin._id,
  });

  engDept.hrApproverId = hr._id;
  await engDept.save();

  const engManager = await Employee.create({
    name: "Meera Manager",
    email: "manager@leaveease.local",
    passwordHash,
    doj,
    deptId: engDept._id,
    roleId: mgrRole._id,
    managerId: hr._id,
  });

  const opsManager = await Employee.create({
    name: "Omkar OpsManager",
    email: "ops.manager@leaveease.local",
    passwordHash,
    doj,
    deptId: opsDept._id,
    roleId: mgrRole._id,
    managerId: admin._id,
  });

  const engEmp = await Employee.create({
    name: "Vivek Mishra",
    email: "employee@leaveease.local",
    passwordHash,
    doj,
    deptId: engDept._id,
    roleId: empRole._id,
    managerId: engManager._id,
  });

  const opsEmp = await Employee.create({
    name: "Riya Operations",
    email: "ops.employee@leaveease.local",
    passwordHash,
    doj,
    deptId: opsDept._id,
    roleId: empRole._id,
    managerId: opsManager._id,
  });

  for (const emp of [admin, hr, engManager, opsManager, engEmp, opsEmp]) {
    await initializeBalancesForEmployee(emp._id, year);
  }

  console.log("Seeded MCSP-232 database successfully.");
  console.log("Demo credentials (password: Demo@1234):");
  console.log("  Admin:       admin@leaveease.local");
  console.log("  HR:          hr@leaveease.local");
  console.log("  Manager:     manager@leaveease.local (Engineering - multi-level)");
  console.log("  Ops Manager: ops.manager@leaveease.local (Operations - single-level)");
  console.log("  Employee:    employee@leaveease.local (Engineering - multi-level)");
  console.log("  Ops Emp:     ops.employee@leaveease.local (Operations - single-level)");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});
