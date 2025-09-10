import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },

  subject: { type: String, required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  grade: { type: String }, // auto-calculated A, B, C...

  remarks: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// auto-grade before save
resultSchema.pre("save", function (next) {
  if (this.score >= 70) this.grade = "A";
  else if (this.score >= 60) this.grade = "B";
  else if (this.score >= 50) this.grade = "C";
  else if (this.score >= 45) this.grade = "D";
  else if (this.score >= 40) this.grade = "E";
  else this.grade = "F";

  next();
});

const Result = mongoose.model("Result", resultSchema);
export default Result;
