import Payment from "../models/payment.js";
import Config from "../models/config.js";
import fs from "fs";
import {
  createFlutterwavePayment,
  createPaystackPayment,
} from "../utils/paymentGateway.js";
import { upload } from "../config/cloudinary.js";
import mongoose from "mongoose";
import crypto from "crypto";

// Existing controllers (unchanged, included for completeness)
export const addPayment = async (req, res) => {
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

    if (
      !studentId ||
      !feeType ||
      !session ||
      !term ||
      !totalAmount ||
      !amount
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student ID format" });
    }

    if (!req.files || !req.files.image) {
      return res
        .status(400)
        .json({ success: false, message: "No teller image uploaded" });
    }

    const { image } = req.files;
    const fileTypes = ["image/jpeg", "image/png", "image/jpg"];
    const imageSize = 1024; // KB

    if (!fileTypes.includes(image.mimetype)) {
      return res
        .status(400)
        .json({ success: false, error: "Image should be jpeg, jpg or png" });
    }

    if (image.size / 1024 > imageSize) {
      return res
        .status(400)
        .json({
          success: false,
          error: `Image size should not be greater than ${imageSize}KB`,
        });
    }

    // ✅ Upload image using tempFilePath
    let imageUrl;
    try {
      imageUrl = await upload(image.tempFilePath, `payments/${studentId}`);
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr.message);
      return res.status(503).json({
        success: false,
        message: "Cloudinary upload failed, please try again later.",
      });
    }

    // ✅ Cleanup temp file after upload
    try {
      fs.unlinkSync(image.tempFilePath);
    } catch (err) {
      console.warn("Failed to clean up temp file:", err.message);
    }

    // ✅ Check if payment already exists for same student + fee + session + term
    let payment = await Payment.findOne({ studentId, feeType, session, term });

    if (payment) {
      // Add new installment
      payment.installments.push({
        amount: Number(amount),
        method,
        proofOfPaymentUrl: imageUrl.secure_url,
        approved: false,
      });
      await payment.save();
    } else {
      // Create new payment
      payment = new Payment({
        studentId,
        feeType,
        description,
        session,
        term,
        totalAmount: Number(totalAmount),
        installments: [
          {
            amount: Number(amount),
            method,
            proofOfPaymentUrl: imageUrl.secure_url,
            approved: false,
          },
        ],
        status: status || "pending",
      });
      await payment.save();
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Payment recorded successfully",
        payment,
      });
  } catch (error) {
    console.error("Manual payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

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

    // ✅ Check if payment exists
    let payment = await Payment.findOne({ studentId, feeType, session, term });

    if (payment) {
      payment.installments.push({ amount, method, reference });
      await payment.save();
    } else {
      payment = new Payment({
        studentId,
        feeType,
        description,
        session,
        term,
        totalAmount,
        installments: [{ amount, method, reference }],
        status: "pending",
      });
      await payment.save();
    }

    res.status(200).json({ success: true, paymentLink, payment });
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
      const verification = await verifyFlutterwavePayment(txId);

      if (verification.status === "success") {
        const payment = await Payment.findOne({
          "installments.reference": verification.data.tx_ref,
        });

        if (payment) {
          const installment = payment.installments.find(
            (inst) => inst.reference === verification.data.tx_ref
          );

          if (installment) {
            installment.approved = true;
            installment.approvedBy = "system";
            installment.approvedAt = new Date();
            await payment.save();
            await generateReceipt(payment._id, installment._id); // Generate receipt after webhook approval
          }
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
            await payment.save();
            await generateReceipt(payment._id, installment._id); // Generate receipt after webhook approval
          }
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
    // Add filtering and search capabilities
    const { session, term, status, studentName, classLevel, feeType } =
      req.query;
    let filter = {};

    if (session) filter.session = session;
    if (term) filter.term = term;
    if (status) filter.status = status;
    if (feeType) filter.feeType = feeType;

    // Search by student name (case-insensitive partial match)
    let studentFilter = {};
    if (studentName) {
      studentFilter = {
        $or: [
          { firstName: { $regex: studentName, $options: "i" } },
          { surName: { $regex: studentName, $options: "i" } },
        ],
      };
    }
    if (classLevel) {
      studentFilter.classLevel = { $regex: classLevel, $options: "i" };
    }

    const payments = await Payment.find(filter)
      .populate({
        path: "studentId",
        match: studentFilter,
        select: "firstName surName classLevel section currentSession",
      })
      .lean();

    // Filter out payments where studentId is null (due to unmatched studentFilter)
    const filteredPayments = payments.filter((payment) => payment.studentId);

    if (!filteredPayments.length) {
      return res
        .status(404)
        .json({ success: false, message: "No payments found" });
    }

    res
      .status(200)
      .json({
        success: true,
        count: filteredPayments.length,
        payments: filteredPayments,
      });
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
      return res
        .status(404)
        .json({ success: false, message: "No payments found for student" });
    }

    const totalFees = payments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    const totalPaid = payments.reduce(
      (sum, p) => sum + p.installments.reduce((s, inst) => s + inst.amount, 0),
      0
    );
    const balance = totalFees - totalPaid;

    res
      .status(200)
      .json({ success: true, studentId, totalFees, totalPaid, balance });
  } catch (error) {
    console.error("Error fetching student balance:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getFeesSummary = async (req, res) => {
  try {
    const { session, term } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;

    const payments = await Payment.find(filter);

    const totalFeesExpected = payments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );
    const totalPaid = payments.reduce(
      (sum, p) => sum + p.installments.reduce((s, inst) => s + inst.amount, 0),
      0
    );
    const totalBalance = totalFeesExpected - totalPaid;

    const fullyPaidCount = payments.filter((p) => p.status === "paid").length;
    const partPaymentCount = payments.filter(
      (p) => p.status === "part payment"
    ).length;
    const pendingCount = payments.filter((p) => p.status === "pending").length;

    res.status(200).json({
      success: true,
      totalFeesExpected,
      totalPaid,
      totalBalance,
      fullyPaidCount,
      partPaymentCount,
      pendingCount,
    });
  } catch (error) {
    console.error("Error fetching fees summary:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getClassSummary = async (req, res) => {
  try {
    const { session, term } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;

    const payments = await Payment.find(filter).populate(
      "studentId",
      "classLevel"
    );

    const classMap = {};
    payments.forEach((p) => {
      const cls = p.studentId?.classLevel || "Unknown";
      if (!classMap[cls]) {
        classMap[cls] = { totalFeesExpected: 0, totalPaid: 0, balance: 0 };
      }
      classMap[cls].totalFeesExpected += p.totalAmount || 0;
      classMap[cls].totalPaid += p.installments.reduce(
        (s, inst) => s + inst.amount,
        0
      );
      classMap[cls].balance += p.balance;
    });

    const result = Object.keys(classMap).map((cls) => ({
      classLevel: cls,
      ...classMap[cls],
    }));

    res.status(200).json({ success: true, summary: result });
  } catch (error) {
    console.error("Error fetching class summary:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getDebtors = async (req, res) => {
  try {
    const { session, term } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;

    const payments = await Payment.find(filter).populate(
      "studentId",
      "firstName surName classLevel admissionNumber"
    );

    const debtors = payments.filter((p) => p.balance > 0);

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
    const adminId = req.user.id;

    const payment = await Payment.findById(paymentId).populate(
      "studentId",
      "firstName surName admissionNumber classLevel section"
    ).populate('installments.approvedBy', 'fullname');

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const installment = payment.installments.id(installmentId);

    if (!installment) {
      return res
        .status(404)
        .json({ success: false, message: "Installment not found" });
    }

    if (installment.approved) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This installment is already approved",
        });
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
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

// New endpoint to get receipt data
export const getReceiptData = async (req, res) => {
  try {
    const { paymentId, installmentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('studentId', 'firstName surName admissionNumber classLevel section')
      .populate('installments.approvedBy', 'fullname');
    
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const installment = payment.installments.id(installmentId);
    if (!installment || !installment.approved) {
      return res
        .status(404)
        .json({ success: false, message: "Approved installment not found" });
    }

    // Fetch school information
    const SchoolInfo = (await import("../models/schoolInformation.js")).default;
    const schoolInfo = await SchoolInfo.findOne();

    // Prepare receipt data
    const receiptData = {
      receiptId: installmentId,
      date: new Date(installment.approvedAt || installment.date).toLocaleDateString(),
      student: {
        name: `${payment.studentId.firstName} ${payment.studentId.surName}`,
        admissionNumber: payment.studentId.admissionNumber || 'N/A',
        class: `${payment.studentId.classLevel} - ${payment.studentId.section || ''}`,
      },
      payment: {
        feeType: payment.feeType.charAt(0).toUpperCase() + payment.feeType.slice(1),
        description: payment.description || 'N/A',
        session: payment.session,
        term: payment.term.charAt(0).toUpperCase() + payment.term.slice(1),
        method: installment.method.charAt(0).toUpperCase() + installment.method.slice(1),
        reference: installment.reference || null,
        amountPaid: installment.amount,
        totalAmount: payment.totalAmount,
        balance: payment.balance,
      },
      school: {
        name: schoolInfo?.schoolName || 'School Name',
        address: schoolInfo?.schoolAddress || 'School Address',
        motto: schoolInfo?.schoolMotto || null,
      },
      approver: installment.approvedBy?.fullname || 'System',
      generatedAt: new Date().toLocaleDateString(),
    };

    res.status(200).json({
      success: true,
      receiptData,
    });
  } catch (error) {
    console.error("Error fetching receipt data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
};
