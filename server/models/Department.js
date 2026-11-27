import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    deptName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    approvalMode: {
      type: String,
      enum: ["single", "multi"],
      default: "single",
    },
    hrApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    weeklyOffs: {
      type: [Number],
      default: [0, 6], // 0 = Sunday, 6 = Saturday
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "weeklyOffs must contain integers between 0 (Sun) and 6 (Sat)",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
