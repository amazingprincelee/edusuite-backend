import mongoose from "mongoose";





const studentSchema = new mongoose.Schema({
  parentId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}, 
  paymentId: {type: mongoose.Schema.Types.ObjectId, ref: "Payment" ,default: null}, 
  admissionNumber: { type: String, unique: true }, 
  firstName: { type: String, required: true },
  surName: { type: String, required: true },
  middleName: { type: String },

  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ["male", "female"], required: true },

  classLevel: { type: String, required: true },
  // e.g., "Nursery 1", "Primary 5", "SS2"

  section: { type: String }, 
  // e.g., "Science", "Arts" (for secondary)

  address: { type: String },
  stateOfOrigin: { type: String },
  nationality: { type: String, default: "Nigeria" },

  parentInfo: {
    fatherName: { type: String, default: null },
    motherName: { type: String, default: null },
    guardianName: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null }
  },

  admissionDate: { type: Date, default: Date.now },
  currentSession: { type: String, required: true }, // e.g., "2024/2025"
  currentTerm: { type: String, enum: ["first", "second", "third"] },

  profilePicture: { type: String }, 

  status: { type: String, enum: ["active", "graduated", "transferred"], default: "active" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


studentSchema.pre("save", async function (next) {
  if (!this.admissionNumber) {
    const count = await mongoose.model("Student").countDocuments();
    const year = new Date().getFullYear().toString().slice(-2); 
    this.admissionNumber = `SCH-${year}${(count + 1).toString().padStart(4, "0")}`;

    

    // output: BEDETELS-2500001
  }
  next();
});

const Student = mongoose.model("Student", studentSchema);
export default Student;
