import express from "express";
import {
  previewWorkingDays,
  applyLeave,
  getMyLeaves,
  decideLeave,
  getMyStats,
  getAllStats,
  getCalendarData,
  getTeamLeaves,
  getAllLeaves,
  cancelLeave,
} from "../controllers/leaveController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/preview-days", protect, previewWorkingDays);
router.post("/", protect, authorize(["Employee", "Manager", "HR"]), applyLeave);
router.get("/my", protect, authorize(["Employee", "Manager", "HR"]), getMyLeaves);
router.get("/my/stats", protect, authorize(["Employee", "Manager", "HR"]), getMyStats);
router.get("/my/calendar", protect, authorize(["Employee", "Manager", "HR", "Admin"]), getCalendarData);
router.get("/stats/all", protect, authorize(["Admin", "HR"]), getAllStats);
router.get("/team", protect, authorize(["Manager", "HR"]), getTeamLeaves);
router.get("/all", protect, authorize(["Admin", "HR"]), getAllLeaves);
router.put("/:id/decision", protect, authorize(["Manager", "HR", "Admin"]), decideLeave);
router.patch("/:id/cancel", protect, authorize(["Employee", "Manager", "HR"]), cancelLeave);

export default router;
