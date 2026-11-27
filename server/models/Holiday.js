import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    holidayDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

holidaySchema.index({ holidayDate: 1, description: 1 }, { unique: true });

export default mongoose.model("Holiday", holidaySchema);
