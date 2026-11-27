import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { AppError } from "../middleware/errorMiddleware.js";

export const getMyNotifications = async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 50);

  const [unreadCount, notifications] = await Promise.all([
    Notification.countDocuments({ empId: req.user.id, readStatus: false }),
    Notification.find({ empId: req.user.id })
      .sort({ createdDate: -1 })
      .limit(limit)
      .lean(),
  ]);

  res.json({ unreadCount, notifications });
};

export const markNotificationRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }
  if (notification.empId.toString() !== req.user.id) {
    throw new AppError("Access denied", 403);
  }

  notification.readStatus = true;
  await notification.save();
  res.json({ notification });
};

export const markAllNotificationsRead = async (req, res) => {
  const result = await Notification.updateMany(
    { empId: req.user.id, readStatus: false },
    { $set: { readStatus: true } }
  );
  res.json({ modifiedCount: result.modifiedCount });
};
