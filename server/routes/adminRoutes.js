import express from "express";
import {
  getAllUsers,
  inviteUser,
  updateUser,
  deleteUser,
  getRoles,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  triggerCarryForward,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Read-only master data accessible to all authenticated users for dropdowns & calendars
router.get("/leave-types", protect, getLeaveTypes);
router.get("/holidays", protect, getHolidays);

// Admin-only routes
router.get("/roles", protect, authorize(["Admin"]), getRoles);

router.get("/users", protect, authorize(["Admin"]), getAllUsers);
router.post("/users/invite", protect, authorize(["Admin"]), inviteUser);
router.put("/users/:id", protect, authorize(["Admin"]), updateUser);
router.delete("/users/:id", protect, authorize(["Admin"]), deleteUser);

router.get("/departments", protect, authorize(["Admin"]), getDepartments);
router.post("/departments", protect, authorize(["Admin"]), createDepartment);
router.put("/departments/:id", protect, authorize(["Admin"]), updateDepartment);
router.delete("/departments/:id", protect, authorize(["Admin"]), deleteDepartment);

router.post("/leave-types", protect, authorize(["Admin"]), createLeaveType);
router.put("/leave-types/:id", protect, authorize(["Admin"]), updateLeaveType);
router.delete("/leave-types/:id", protect, authorize(["Admin"]), deleteLeaveType);

router.post("/holidays", protect, authorize(["Admin"]), createHoliday);
router.put("/holidays/:id", protect, authorize(["Admin"]), updateHoliday);
router.delete("/holidays/:id", protect, authorize(["Admin"]), deleteHoliday);

router.post("/carry-forward", protect, authorize(["Admin"]), triggerCarryForward);

export default router;
