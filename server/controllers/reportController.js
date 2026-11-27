import {
  getSummaryReport,
  getMonthlyTrendsReport,
  getLeaveHistoryReport,
  getDepartmentUtilisationReport,
  getPendingApprovalsReport,
  getLeaveBalanceSummaryReport,
  buildCsvBuffer,
  streamPdf,
} from "../services/reportService.js";

function sendReportResponse(res, { format = "json", title, filenameBase, columns, rows }) {
  if (format === "csv") {
    const csv = buildCsvBuffer(columns, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
    return res.send(csv);
  }
  if (format === "pdf") {
    return streamPdf(res, title, `${filenameBase}.pdf`, columns, rows);
  }
  return res.json(rows);
}

export const getSummary = async (req, res) => {
  const data = await getSummaryReport(req.user);
  res.json(data);
};

export const getMonthlyTrends = async (req, res) => {
  const data = await getMonthlyTrendsReport(req.user);
  res.json(data);
};

export const getHistoryReport = async (req, res) => {
  const rows = await getLeaveHistoryReport(req.user, req.query);
  return sendReportResponse(res, {
    format: req.query.format,
    title: "Employee Leave History Report",
    filenameBase: "employee-leave-history",
    columns: [
      { key: "employee", label: "Employee" },
      { key: "department", label: "Department" },
      { key: "leaveType", label: "Leave Type" },
      { key: "startDate", label: "Start Date" },
      { key: "endDate", label: "End Date" },
      { key: "noOfDays", label: "Days" },
      { key: "status", label: "Status" },
      { key: "approvedBy", label: "Approved By" },
    ],
    rows,
  });
};

export const getDepartmentReport = async (req, res) => {
  const rows = await getDepartmentUtilisationReport(req.user, req.query);
  return sendReportResponse(res, {
    format: req.query.format,
    title: "Department-Wise Leave Utilisation Report",
    filenameBase: "department-utilisation",
    columns: [
      { key: "department", label: "Department" },
      { key: "totalRequests", label: "Approved Requests" },
      { key: "totalDays", label: "Total Working Days" },
    ],
    rows,
  });
};

export const getRegisterReport = async (req, res) => {
  const rows = await getLeaveHistoryReport(req.user, req.query);
  return sendReportResponse(res, {
    format: req.query.format,
    title: "Monthly / Annual Leave Register",
    filenameBase: "leave-register",
    columns: [
      { key: "employee", label: "Employee" },
      { key: "department", label: "Department" },
      { key: "leaveType", label: "Leave Type" },
      { key: "startDate", label: "Start Date" },
      { key: "endDate", label: "End Date" },
      { key: "noOfDays", label: "Days" },
      { key: "status", label: "Status" },
    ],
    rows,
  });
};

export const getPendingReport = async (req, res) => {
  const rows = await getPendingApprovalsReport(req.user, req.query);
  return sendReportResponse(res, {
    format: req.query.format,
    title: "Pending Approvals Report",
    filenameBase: "pending-approvals",
    columns: [
      { key: "employee", label: "Employee" },
      { key: "department", label: "Department" },
      { key: "leaveType", label: "Leave Type" },
      { key: "startDate", label: "Start Date" },
      { key: "endDate", label: "End Date" },
      { key: "noOfDays", label: "Days" },
      { key: "status", label: "Stage" },
    ],
    rows,
  });
};

export const getBalancesReport = async (req, res) => {
  const rows = await getLeaveBalanceSummaryReport(req.user, req.query);
  return sendReportResponse(res, {
    format: req.query.format,
    title: "Leave Balance Summary Report",
    filenameBase: "leave-balance-summary",
    columns: [
      { key: "employee", label: "Employee" },
      { key: "department", label: "Department" },
      { key: "leaveType", label: "Leave Type" },
      { key: "year", label: "Year" },
      { key: "allocated", label: "Allocated" },
      { key: "carriedForward", label: "Carried Forward" },
      { key: "used", label: "Used" },
      { key: "remaining", label: "Remaining" },
    ],
    rows,
  });
};
