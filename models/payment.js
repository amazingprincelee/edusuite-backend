import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  feeType: {
    type: String,
    enum: ["tuition", "admission", "exam", "party", "others"],
    required: true
  },

  description: { type: String }, // e.g. "First Term Tuition 2024/2025"

  session: { type: String, required: true }, // e.g., "2024/2025"
  term: { type: String, enum: ["first", "second", "third"], required: true },

  totalAmount: { type: Number }, 

  installments: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      method: { type: String, enum: ["bank transfer", "pos", "online", "cash"], default: "bank transfer" },
      reference: { type: String } // e.g. transaction receipt upload
    }
  ],

  balance: { type: Number, default: function () {
    return this.totalAmount;
  }},

  status: { 
    type: String, 
    enum: ["pending", "part payment", "paid"], 
    default: "pending" 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update balance and status automatically
paymentSchema.pre("save", function (next) {
  const paid = this.installments.reduce((sum, inst) => sum + inst.amount, 0);
  this.balance = this.totalAmount - paid;

  if (paid === 0) this.status = "pending";
  else if (paid < this.totalAmount) this.status = "part payment";
  else this.status = "paid";

  next();
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
