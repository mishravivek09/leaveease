import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    empId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    allocated: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    used: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    remaining: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    carriedForward: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    carryForwardApplied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ empId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

export default mongoose.model("LeaveBalance", leaveBalanceSchema);
