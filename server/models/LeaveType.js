import mongoose from "mongoose";

const leaveTypeSchema = new mongoose.Schema(
  {
    typeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    maxDaysPerYear: {
      type: Number,
      required: true,
      min: 1,
    },
    carryForwardAllowed: {
      type: Boolean,
      default: false,
    },
    maxCarryForwardDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("LeaveType", leaveTypeSchema);
