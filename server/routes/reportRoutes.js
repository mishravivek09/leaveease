import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getSummary,
  getMonthlyTrends,
  getHistoryReport,
  getDepartmentReport,
  getRegisterReport,
  getPendingReport,
  getBalancesReport,
} from "../controllers/reportController.js";

const router = express.Router();

const reportRoles = ["Manager", "HR", "Admin"];

router.get("/summary", protect, authorize(reportRoles), getSummary);
router.get("/trends", protect, authorize(reportRoles), getMonthlyTrends);
router.get("/history", protect, authorize(reportRoles), getHistoryReport);
router.get("/department-utilisation", protect, authorize(reportRoles), getDepartmentReport);
router.get("/register", protect, authorize(reportRoles), getRegisterReport);
router.get("/pending", protect, authorize(reportRoles), getPendingReport);
router.get("/balances", protect, authorize(reportRoles), getBalancesReport);

export default router;
