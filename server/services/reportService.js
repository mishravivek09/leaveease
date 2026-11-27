import PDFDocument from "pdfkit";
import LeaveApplication from "../models/LeaveApplication.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import { parseUtcDate } from "./leaveService.js";

async function getScopedEmployeeIds(user, queryDeptId, queryEmpId) {
  if (user.roleName === "Admin") {
    const empFilter = {};
    if (queryEmpId) empFilter._id = queryEmpId;
    if (queryDeptId) empFilter.deptId = queryDeptId;
    if (!queryEmpId && !queryDeptId) return null;
    const emps = await Employee.find(empFilter).select("_id").lean();
    return emps.map((e) => e._id);
  }

  const deptsManagedByHr = await Department.find({ hrApproverId: user.id }).select("_id").lean();
  const hrDeptIds = deptsManagedByHr.map((d) => d._id);

  const scopeFilter = {
    $or: [
      { managerId: user.id },
      ...(hrDeptIds.length > 0 ? [{ deptId: { $in: hrDeptIds } }] : []),
      ...(user.roleName === "HR" && user.deptId ? [{ deptId: user.deptId }] : []),
    ],
  };

  const scopedEmps = await Employee.find(scopeFilter).select("_id deptId").lean();
  let ids = scopedEmps.map((e) => e._id.toString());

  if (queryDeptId) {
    ids = scopedEmps
      .filter((e) => e.deptId?.toString() === queryDeptId)
      .map((e) => e._id.toString());
  }
  if (queryEmpId) {
    ids = ids.filter((id) => id === queryEmpId);
  }
  return ids;
}

function buildDateFilter(startDate, endDate) {
  const filter = {};
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  if (start) filter.$gte = start;
  if (end) filter.$lte = end;
  return Object.keys(filter).length > 0 ? filter : null;
}

export async function getSummaryReport(user) {
  const scopedIds = await getScopedEmployeeIds(user);
  const leaveFilter = scopedIds ? { empId: { $in: scopedIds } } : {};
  const userFilter = scopedIds ? { _id: { $in: scopedIds } } : {};

  const [totalUsers, totalLeaves, pending, approved, rejected] = await Promise.all([
    Employee.countDocuments(userFilter),
    LeaveApplication.countDocuments(leaveFilter),
    LeaveApplication.countDocuments({ ...leaveFilter, status: { $in: ["Pending Manager", "Pending HR"] } }),
    LeaveApplication.countDocuments({ ...leaveFilter, status: "Approved" }),
    LeaveApplication.countDocuments({ ...leaveFilter, status: "Rejected" }),
  ]);

  return { totalUsers, totalLeaves, pending, approved, rejected };
}

export async function getMonthlyTrendsReport(user) {
  const scopedIds = await getScopedEmployeeIds(user);
  const match = scopedIds ? [{ $match: { empId: { $in: scopedIds } } }] : [];

  const data = await LeaveApplication.aggregate([
    ...match,
    {
      $group: {
        _id: { $month: "$startDate" },
        count: { $sum: 1 },
        days: { $sum: "$noOfDays" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return data.map((d) => ({ month: d._id, leaves: d.count, days: d.days }));
}

export async function getLeaveHistoryReport(user, query) {
  const scopedIds = await getScopedEmployeeIds(user, query.deptId, query.empId);
  const filter = {};
  if (scopedIds) filter.empId = { $in: scopedIds };
  if (query.status) filter.status = query.status;
  const dateRange = buildDateFilter(query.startDate, query.endDate);
  if (dateRange) filter.startDate = dateRange;

  const leaves = await LeaveApplication.find(filter)
    .populate({
      path: "empId",
      select: "name email deptId",
      populate: { path: "deptId", select: "deptName" },
    })
    .populate("leaveTypeId", "typeName")
    .populate("approvedBy", "name")
    .sort({ appliedDate: -1 })
    .lean();

  return leaves.map((l) => ({
    employee: l.empId?.name || "Unknown",
    email: l.empId?.email || "",
    department: l.empId?.deptId?.deptName || "N/A",
    leaveType: l.leaveTypeId?.typeName || "N/A",
    startDate: l.startDate ? new Date(l.startDate).toISOString().slice(0, 10) : "",
    endDate: l.endDate ? new Date(l.endDate).toISOString().slice(0, 10) : "",
    noOfDays: l.noOfDays ?? 0,
    status: l.status,
    approvedBy: l.approvedBy?.name || "-",
  }));
}

export async function getDepartmentUtilisationReport(user, query) {
  const scopedIds = await getScopedEmployeeIds(user, query.deptId, null);
  const filter = { status: "Approved" };
  if (scopedIds) filter.empId = { $in: scopedIds };
  const dateRange = buildDateFilter(query.startDate, query.endDate);
  if (dateRange) filter.startDate = dateRange;

  const leaves = await LeaveApplication.find(filter)
    .populate({
      path: "empId",
      select: "deptId",
      populate: { path: "deptId", select: "deptName" },
    })
    .lean();

  const map = new Map();
  for (const l of leaves) {
    const deptName = l.empId?.deptId?.deptName || "Unassigned";
    const entry = map.get(deptName) || { department: deptName, totalRequests: 0, totalDays: 0 };
    entry.totalRequests += 1;
    entry.totalDays += l.noOfDays || 0;
    map.set(deptName, entry);
  }
  return Array.from(map.values());
}

export async function getPendingApprovalsReport(user, query) {
  return getLeaveHistoryReport(user, {
    ...query,
    status: query.status || undefined,
  }).then((rows) => rows.filter((r) => ["Pending Manager", "Pending HR"].includes(r.status)));
}

export async function getLeaveBalanceSummaryReport(user, query) {
  const year = Number(query.year || new Date().getUTCFullYear());
  const scopedIds = await getScopedEmployeeIds(user, query.deptId, query.empId);
  const filter = { year };
  if (scopedIds) filter.empId = { $in: scopedIds };

  const balances = await LeaveBalance.find(filter)
    .populate({
      path: "empId",
      select: "name email deptId",
      populate: { path: "deptId", select: "deptName" },
    })
    .populate("leaveTypeId", "typeName")
    .lean();

  return balances.map((b) => ({
    employee: b.empId?.name || "Unknown",
    department: b.empId?.deptId?.deptName || "N/A",
    leaveType: b.leaveTypeId?.typeName || "N/A",
    year: b.year,
    allocated: b.allocated,
    carriedForward: b.carriedForward,
    used: b.used,
    remaining: b.remaining,
  }));
}

function escapeCsvCell(val) {
  const str = String(val ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvBuffer(columns, rows) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(",")
  );
  return Buffer.from([header, ...body].join("\r\n"), "utf8");
}

export function streamPdf(res, title, filename, columns, rows) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
  doc.pipe(res);

  doc.fontSize(16).text("LeaveEase : MCSP-232 MIS Report", { align: "left" });
  doc.fontSize(12).text(title, { align: "left" });
  doc.fontSize(9).fillColor("#555").text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(1);

  const colWidth = Math.floor((doc.page.width - 72) / columns.length);
  doc.fillColor("#000").fontSize(9).font("Helvetica-Bold");

  let y = doc.y;
  columns.forEach((col, i) => {
    doc.text(col.label, 36 + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
  });
  doc.moveDown(0.5);
  doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font("Helvetica").fontSize(8);
  for (const row of rows) {
    if (doc.y > doc.page.height - 50) {
      doc.addPage();
    }
    const rowY = doc.y;
    columns.forEach((col, i) => {
      doc.text(String(row[col.key] ?? ""), 36 + i * colWidth, rowY, {
        width: colWidth - 4,
        ellipsis: true,
      });
    });
    doc.moveDown(0.6);
  }

  if (rows.length === 0) {
    doc.text("No records matched the selected filters.");
  }

  doc.end();
}
