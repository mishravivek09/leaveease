import mongoose from "mongoose";

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["Applied", "Manager Approved", "Approved", "Rejected", "Cancelled"],
      required: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const leaveApplicationSchema = new mongoose.Schema(
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    noOfDays: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending Manager", "Pending HR", "Approved", "Rejected", "Cancelled"],
      default: "Pending Manager",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    auditTrail: {
      type: [auditEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

leaveApplicationSchema.index({ empId: 1, status: 1, startDate: 1 });

export default mongoose.model("LeaveApplication", leaveApplicationSchema);
