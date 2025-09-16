import mongoose from "mongoose";

const classListSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: [true, "Class level is required"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true } // adds createdAt & updatedAt
);

const ClassList = mongoose.model("ClassList", classListSchema);

export default ClassList;
