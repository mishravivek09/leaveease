import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      enum: ["Employee", "Manager", "HR", "Admin"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Role", roleSchema);
