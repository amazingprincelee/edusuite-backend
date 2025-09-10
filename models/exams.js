import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "1st Term Mathematics Exam"
  subject: { type: String, required: true },
  classLevel: { type: String, required: true }, // e.g. "SS2"
  term: { type: String, enum: ["first", "second", "third"], required: true },
  session: { type: String, required: true }, // e.g. "2024/2025"
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },

  createdAt: { type: Date, default: Date.now }
});

const Exam = mongoose.model("Exam", examSchema);
export default Exam;
