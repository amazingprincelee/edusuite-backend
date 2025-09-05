import mongoose from "mongoose";


const teacherSchema = new  mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    subjects: [{type: String, require: true}],
    
  salary: { type: Number, default: 0 },
  designation: { type: String, default: null }, // e.g., "Senior Teacher", "Head of Department"
  status: { type: String, enum: ["Part Time", "Full Time", ], default: "Full Time" },
  bankDetails: {
  bankName: { type: String, required: true },
  bankAccount: { type: String, required: true },
  accountName: { type: String, required: true }
},

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;