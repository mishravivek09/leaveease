import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { updateProfile, changePassword, getMyBalances } from "../controllers/userController.js";

const router = express.Router();

router.put("/me", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.get("/my-balances", protect, getMyBalances);

export default router;
