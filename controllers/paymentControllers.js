import Payment from "../models/payment.js";
import Student from "../models/student.js";
import Config from "../models/config.js";
import {
  createFlutterwavePayment,
  createPaystackPayment,
} from "../utils/paymentGateway.js";
import { upload } from "../config/cloudinary.js";

export const cashPayment = async (req, res) => {
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

     if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, message: "No teller image uploaded" });
    }

    const { image } = req.files;
    const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
    const imageSize = 1024;

    if (image) {
      if (!fileTypes.includes(image.mimetype)) {
        return res
          .status(400)
          .json({ success: false, error: "image should be jpeg, jpg or png" });
      }
    } else {
      return res.status(400).json({ message: "image file error" });
    }

    //Validate image size
    if (image.size / 1024 > imageSize) {
      return res.status(400).json({
        success: false,
        error: `Image size should not be greater than ${imageSize}`,
      });
    }

    const isConnected = await isCloudinaryConnected();
        if (!isConnected) {
          return res.status(400).json({message:"Cloudinary is not reachable. Check your internet or credentials."});
        }
    
         const imageUrl = await upload(image.tempFilePath, studentId);
    
         if (!imageUrl) {
          return res.status(500).json({ message: "Image upload failed" });
        }

    const currentPayment = new Payment({
      studentId: studentId,
      feeType: feeType,
      description: description,
      session: session,
      term: term,
      totalAmount: totalAmount,
      installments: {
        amount: amount,
        method: method,
        reference: imageUrl,
      },
      status: status,
    });

    await currentPayment.save();

    res.status(200).json({ message: "Payment successfully", currentPayment });
  } catch (error) {
    res.status(500).json({ message: "Internal Server error" });
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



// ✅ Flutterwave webhook
export const flutterwaveWebhook = async (req, res) => {
  try {
    const config = await Config.findOne();
    const secretHash = config.flutterwaveSecret; // Or a separate webhook secret if you set it

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
        await Payment.findOneAndUpdate(
          { "installments.reference": verification.data.tx_ref },
          { status: "paid" },
          { new: true }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Flutterwave Webhook Error:", error);
    res.sendStatus(500);
  }
};

// ✅ Paystack webhook
export const paystackWebhook = async (req, res) => {
  try {
    const config = await Config.findOne();
    const secret = config.paystackSecret;

    // Validate signature
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

      // Verify with Paystack API
      const verification = await verifyPaystackPayment(reference);

      if (verification.status && verification.data.status === "success") {
        await Payment.findOneAndUpdate(
          { "installments.reference": reference },
          { status: "paid" },
          { new: true }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    res.sendStatus(500);
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

// ✅ Get all payments with optional filters
export const getAllPayments = async (req, res) => {
  try {
    const { session, term, classLevel, status } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;
    if (status) filter.status = status;

    // Join student info if classLevel is needed
    let query = Payment.find(filter).populate("studentId", "firstName surName classLevel admissionNumber");

    let payments = await query;

    if (classLevel) {
      payments = payments.filter(p => p.studentId?.classLevel === classLevel);
    }

    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
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




