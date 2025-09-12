import Payment from "../models/payment.js";
import Config from "../models/config.js";
import {
  createFlutterwavePayment,
  createPaystackPayment,
} from "../utils/paymentGateway.js";
import { upload } from "../config/cloudinary.js";
import mongoose from "mongoose";


export const manualPayment = async (req, res) => {
  try {
    const {
      studentId,
      feeType,
      description,
      session,
      term,
      totalAmount,
      amount,
      method,
      status,
    } = req.body;

    console.log({studentId, feeType, description, session, term, totalAmount, amount, method, status});
    
    // Validate required fields
    if (!studentId || !feeType || !session || !term || !totalAmount || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Validate studentId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid student ID format" 
      });
    }

    // Check if file exists
    if (!req.files || !req.files.image) {
      return res.status(400).json({ 
        success: false, 
        message: "No teller image uploaded" 
      });
    }

    const { image } = req.files;
    const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
    const imageSize = 1024; // KB

    // Validate file type
    if (!fileTypes.includes(image.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        error: "Image should be jpeg, jpg or png" 
      });
    }

    // Validate image size
    if (image.size / 1024 > imageSize) {
      return res.status(400).json({
        success: false,
        error: `Image size should not be greater than ${imageSize}KB`,
      });
    }

    console.log("Starting image upload to Cloudinary...");
    
    // Upload image to Cloudinary
    const imageUrl = await upload(image.tempFilePath, studentId);
    
    if (!imageUrl || !imageUrl.secure_url) {
      return res.status(500).json({ 
        success: false,
        message: "Image upload failed" 
      });
    }

    console.log("Image uploaded successfully:", imageUrl.secure_url);

    // Create payment document - FIX: installments should be an array
    const currentPayment = new Payment({
      studentId: new mongoose.Types.ObjectId(studentId),
      feeType: feeType,
      description: description,
      session: session,
      term: term,
      totalAmount: Number(totalAmount),
      installments: [
        {
          amount: Number(amount),
          method: method,
          receiptUrl: imageUrl.secure_url,
          approved: false,
        }
      ],
      status: status || "pending",
    });

    console.log("Saving payment to database...");
    
    const savedPayment = await currentPayment.save();
    
    console.log("Payment saved successfully:", savedPayment._id);

    res.status(200).json({ 
      success: true,
      message: "Payment created successfully", 
      payment: savedPayment 
    });
    
  } catch (error) {
    console.error("Manual payment error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Initiate online payment
export const initiatePayment = async (req, res) => {
  try {
    const {
      studentId,
      feeType,
      description,
      session,
      term,
      totalAmount,
      amount,
      method,
      reference,
      email,
      name,
    } = req.body;

    let paymentLink;

    if (method === "flutterwave") {
      const response = await createFlutterwavePayment({
        amount,
        reference,
        email,
        name,
        description,
      });
      paymentLink = response.data.link;
    } else if (method === "paystack") {
      const response = await createPaystackPayment({
        amount,
        reference,
        email,
        name,
        description,
      });
      paymentLink = response.data.authorization_url;
    } else {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Save payment in DB
    const currentPayment = new Payment({
      studentId,
      feeType,
      description,
      session,
      term,
      totalAmount,
      installments: { amount, method, reference },
      status: "pending",
    });
    await currentPayment.save();

    res.status(200).json({ success: true, paymentLink, currentPayment });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error });
  }
};




export const flutterwaveWebhook = async (req, res) => {
  try {
    const config = await Config.findOne();
    const secretHash = config.flutterwaveSecret; 

    // Validate signature
    const signature = req.headers["verif-hash"];
    if (!signature || signature !== secretHash) {
      return res.status(401).send("Invalid signature");
    }

    const payload = req.body;

    if (
      payload.event === "charge.completed" &&
      payload.data.status === "successful"
    ) {
      const txId = payload.data.id;

      // Verify with Flutterwave API
      const verification = await verifyFlutterwavePayment(txId);

      if (verification.status === "success") {
        const payment = await Payment.findOne({
          "installments.reference": verification.data.tx_ref
        });

        if (payment) {
          const installment = payment.installments.find(
            (inst) => inst.reference === verification.data.tx_ref
          );

          if (installment) {
            installment.approved = true;
            installment.approvedBy = "system"; 
            installment.approvedAt = new Date();
          }

          await payment.save();
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Flutterwave Webhook Error:", error);
    res.sendStatus(500);
  }
};



export const paystackWebhook = async (req, res) => {
  try {
    const config = await Config.findOne();
    const secret = config.paystackSecret;

    // ✅ Validate signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      // ✅ Verify with Paystack API
      const verification = await verifyPaystackPayment(reference);

      if (verification.status && verification.data.status === "success") {
        const payment = await Payment.findOne({
          "installments.reference": reference,
        });

        if (payment) {
          const installment = payment.installments.find(
            (inst) => inst.reference === reference
          );

          if (installment) {
            installment.approved = true;
            installment.approvedBy = "system"; 
            installment.approvedAt = new Date();
          }

          await payment.save();
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    res.sendStatus(500);
  }
};


export const getAllPayments = async (req, res) => {
  try {

    const payments = await Payment.find().populate('studentId', 'firstName surName classLevel section currentSession');

    if (!payments || payments.length === 0) {
       return res.status(404).json({success: false, message:"No payment found"})
    }

    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




export const getStudentBalance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const payments = await Payment.find({ studentId });

    if (!payments.length) {
      return res.status(404).json({ success: false, message: "No payments found for student" });
    }

    const totalFees = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) =>
      sum + p.installments.reduce((s, inst) => s + inst.amount, 0), 0);
    const balance = totalFees - totalPaid;

    res.status(200).json({ 
      success: true, 
      studentId, 
      totalFees, 
      totalPaid, 
      balance 
    });
  } catch (error) {
    console.error("Error fetching student balance:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




// ✅ Get summary of fees for a session & term
export const getFeesSummary = async (req, res) => {
  try {
    const { session, term } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;

    const payments = await Payment.find(filter);

    const totalFeesExpected = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) =>
      sum + p.installments.reduce((s, inst) => s + inst.amount, 0), 0);
    const totalBalance = totalFeesExpected - totalPaid;

    const fullyPaidCount = payments.filter(p => p.status === "paid").length;
    const partPaymentCount = payments.filter(p => p.status === "part payment").length;
    const pendingCount = payments.filter(p => p.status === "pending").length;

    res.status(200).json({
      success: true,
      totalFeesExpected,
      totalPaid,
      totalBalance,
      fullyPaidCount,
      partPaymentCount,
      pendingCount
    });
  } catch (error) {
    console.error("Error fetching fees summary:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Get summary per class
export const getClassSummary = async (req, res) => {
  try {
    const { session, term } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;

    const payments = await Payment.find(filter).populate("studentId", "classLevel");

    // Group by classLevel
    const classMap = {};
    payments.forEach(p => {
      const cls = p.studentId?.classLevel || "Unknown";
      if (!classMap[cls]) {
        classMap[cls] = { totalFeesExpected: 0, totalPaid: 0, balance: 0 };
      }
      classMap[cls].totalFeesExpected += (p.totalAmount || 0);
      classMap[cls].totalPaid += p.installments.reduce((s, inst) => s + inst.amount, 0);
      classMap[cls].balance += p.balance;
    });

    const result = Object.keys(classMap).map(cls => ({
      classLevel: cls,
      ...classMap[cls]
    }));

    res.status(200).json({ success: true, summary: result });
  } catch (error) {
    console.error("Error fetching class summary:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// ✅ List students with outstanding balance
export const getDebtors = async (req, res) => {
  try {
    const { session, term } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;

    const payments = await Payment.find(filter).populate("studentId", "firstName surName classLevel admissionNumber");

    const debtors = payments.filter(p => p.balance > 0);

    res.status(200).json({ success: true, count: debtors.length, debtors });
  } catch (error) {
    console.error("Error fetching debtors:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


export const approvePayment = async (req, res) => {
    console.log("approve payment controller got hit");
    

  try {
    const { paymentId, installmentId } = req.body;
     const adminId = req.user.id

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const installment = payment.installments.id(installmentId);

    if (!installment) {
      return res.status(404).json({ success: false, message: "Installment not found" });
    }

    if (installment.approved) {
      return res.status(400).json({ success: false, message: "This installment is already approved" });
    }

    installment.approved = true;
    installment.approvedBy = adminId;
    installment.approvedAt = new Date();

    await payment.save();

    res.status(200).json({
      success: true,
      message: "Installment approved successfully",
      payment,
    });
  } catch (error) {
    console.error("Error approving installment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




