import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  // References
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" }, // Optional for CA scores
  
  // Academic Details
  subject: { type: String, required: true },
  term: { 
    type: String, 
    required: true,
    enum: ["first", "second", "third"]
  },
  session: { 
    type: String, 
    required: true,
    match: /^\d{4}\/\d{4}$/ // Format: 2023/2024
  },
  
  // Score Type and Values
  scoreType: {
    type: String,
    required: true,
    enum: ["CA", "EXAM", "FINAL"]
  },
  
  // Nigerian Education System Scores
  caScore: { 
    type: Number, 
    min: 0, 
    max: 40,
    default: null
  },
  examScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: null
  },
  totalScore: { 
    type: Number, 
    min: 0, 
    max: 100,
    default: null
  },
  
  // Legacy score field for backward compatibility
  score: { 
    type: Number, 
    min: 0, 
    max: 100
  },
  
  // Grading
  grade: { 
    type: String,
    enum: ["A", "B", "C", "D", "E", "F"]
  },
  remark: { 
    type: String,
    enum: ["Excellent", "Very Good", "Good", "Pass", "Poor", "Fail"]
  },
  points: {
    type: Number,
    min: 0,
    max: 5
  },
  
  // Additional CA Details
  caType: {
    type: String,
    enum: ["test1", "test2", "assignment", "project"],
    required: function() {
      return this.scoreType === "CA";
    }
  },
  
  // Position and Analytics
  position: { type: Number },
  classAverage: { type: Number },
  
  // Comments
  remarks: { type: String, default: "" },
  teacherComment: { type: String, default: "" },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
resultSchema.index({ student: 1, subject: 1, term: 1, session: 1, scoreType: 1 });
resultSchema.index({ teacher: 1, subject: 1, term: 1, session: 1 });
resultSchema.index({ term: 1, session: 1, subject: 1 });

// Auto-grade before save (Nigerian Education System)
resultSchema.pre("save", function (next) {
  // Determine which score to use for grading
  let scoreToGrade = this.totalScore || this.score || this.examScore || this.caScore;
  
  if (scoreToGrade !== null && scoreToGrade !== undefined) {
    if (scoreToGrade >= 70) {
      this.grade = "A";
      this.remark = "Excellent";
      this.points = 5;
    } else if (scoreToGrade >= 60) {
      this.grade = "B";
      this.remark = "Very Good";
      this.points = 4;
    } else if (scoreToGrade >= 50) {
      this.grade = "C";
      this.remark = "Good";
      this.points = 3;
    } else if (scoreToGrade >= 45) {
      this.grade = "D";
      this.remark = "Pass";
      this.points = 2;
    } else if (scoreToGrade >= 40) {
      this.grade = "E";
      this.remark = "Poor";
      this.points = 1;
    } else {
      this.grade = "F";
      this.remark = "Fail";
      this.points = 0;
    }
  }
  
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted session display
resultSchema.virtual('sessionDisplay').get(function() {
  return this.session;
});

// Virtual for term display
resultSchema.virtual('termDisplay').get(function() {
  const termMap = {
    'first': 'First Term',
    'second': 'Second Term', 
    'third': 'Third Term'
  };
  return termMap[this.term] || this.term;
});

// Static method to calculate final result from CA and Exam
resultSchema.statics.calculateFinalResult = function(caScore, examScore) {
  // Nigerian system: CA = 40%, Exam = 60%
  const ca = caScore || 0;
  const exam = examScore || 0;
  return Math.round((ca * 0.4) + (exam * 0.6));
};

// Static method to get grade info
resultSchema.statics.getGradeInfo = function(score) {
  if (score >= 70) return { grade: "A", remark: "Excellent", points: 5 };
  if (score >= 60) return { grade: "B", remark: "Very Good", points: 4 };
  if (score >= 50) return { grade: "C", remark: "Good", points: 3 };
  if (score >= 45) return { grade: "D", remark: "Pass", points: 2 };
  if (score >= 40) return { grade: "E", remark: "Poor", points: 1 };
  return { grade: "F", remark: "Fail", points: 0 };
};

const Result = mongoose.model("Result", resultSchema);
export default Result;
