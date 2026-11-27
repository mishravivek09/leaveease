import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    empId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    readStatus: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: [
        "LEAVE_APPLIED",
        "LEAVE_FORWARDED",
        "LEAVE_APPROVED",
        "LEAVE_REJECTED",
        "LEAVE_CANCELLED",
        "SYSTEM",
      ],
      default: "SYSTEM",
    },
    relatedLeaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveApplication",
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ empId: 1, readStatus: 1, createdDate: -1 });

export default mongoose.model("Notification", notificationSchema);
