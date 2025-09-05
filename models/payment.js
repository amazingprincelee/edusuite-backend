import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  feeType: {
    type: String,
    enum: ["Tuition", "Admission", "Exam", "Party", "Other"],
    required: true
  },

  description: { type: String }, // e.g. "First Term Tuition 2024/2025"

  session: { type: String, required: true }, // e.g., "2024/2025"
  term: { type: String, enum: ["First", "Second", "Third"], required: true },

  totalAmount: { type: Number, required: true }, 

  installments: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      method: { type: String, enum: ["Bank Transfer", "POS", "Online"], default: "Bank Transfer" },
      reference: { type: String } // e.g. transaction receipt upload from cloudinary
    }
  ],

  balance: { type: Number, default: function () {
    return this.totalAmount;
  }},

  status: { 
    type: String, 
    enum: ["Pending", "Part Payment", "Paid"], 
    default: "Pending" 
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update balance and status automatically
paymentSchema.pre("save", function (next) {
  const paid = this.installments.reduce((sum, inst) => sum + inst.amount, 0);
  this.balance = this.totalAmount - paid;

  if (paid === 0) this.status = "Pending";
  else if (paid < this.totalAmount) this.status = "Part Payment";
  else this.status = "Paid";

  next();
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
