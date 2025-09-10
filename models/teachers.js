import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["part time", "full time"],
    default: "full time",
  },
  bankDetails: {
    bankName: { type: String, required: true },
    bankAccount: { type: String, required: true },
    accountName: { type: String, required: true },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;
