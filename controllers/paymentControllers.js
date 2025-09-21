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

// Financial Reports Functions
export const getFinancialReports = async (req, res) => {
  try {
    const { session, term, startDate, endDate } = req.query;

    let filter = {};
    if (session) filter.session = session;
    if (term) filter.term = term;
    
    // Date range filter for installments
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter).populate('studentId', 'firstName surName classLevel admissionNumber');

    // Overall Financial Summary
    const totalFeesExpected = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => {
      return sum + p.installments
        .filter(inst => inst.approved && (!startDate && !endDate || 
          (dateFilter.$gte ? inst.date >= dateFilter.$gte : true) &&
          (dateFilter.$lte ? inst.date <= dateFilter.$lte : true)))
        .reduce((s, inst) => s + inst.amount, 0);
    }, 0);
    const totalBalance = totalFeesExpected - totalPaid;

    // Payment Status Distribution
    const statusDistribution = {
      completed: payments.filter(p => p.status === 'completed').length,
      partial: payments.filter(p => p.status === 'partial').length,
      pending: payments.filter(p => p.status === 'pending').length
    };

    // Fee Type Analysis
    const feeTypeAnalysis = {};
    payments.forEach(p => {
      if (!feeTypeAnalysis[p.feeType]) {
        feeTypeAnalysis[p.feeType] = { expected: 0, paid: 0, balance: 0, count: 0 };
      }
      feeTypeAnalysis[p.feeType].expected += p.totalAmount || 0;
      feeTypeAnalysis[p.feeType].paid += p.installments
        .filter(inst => inst.approved)
        .reduce((s, inst) => s + inst.amount, 0);
      feeTypeAnalysis[p.feeType].balance += p.balance;
      feeTypeAnalysis[p.feeType].count += 1;
    });

    // Class Level Analysis
    const classAnalysis = {};
    payments.forEach(p => {
      const classLevel = p.studentId?.classLevel || 'Unknown';
      if (!classAnalysis[classLevel]) {
        classAnalysis[classLevel] = { expected: 0, paid: 0, balance: 0, studentCount: 0 };
      }
      classAnalysis[classLevel].expected += p.totalAmount || 0;
      classAnalysis[classLevel].paid += p.installments
        .filter(inst => inst.approved)
        .reduce((s, inst) => s + inst.amount, 0);
      classAnalysis[classLevel].balance += p.balance;
      classAnalysis[classLevel].studentCount += 1;
    });

    // Payment Method Analysis
    const methodAnalysis = {};
    payments.forEach(p => {
      p.installments.filter(inst => inst.approved).forEach(inst => {
        if (!methodAnalysis[inst.method]) {
          methodAnalysis[inst.method] = { amount: 0, count: 0 };
        }
        methodAnalysis[inst.method].amount += inst.amount;
        methodAnalysis[inst.method].count += 1;
      });
    });

    // Monthly Revenue Trend (last 12 months)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthlyTotal = payments.reduce((sum, p) => {
        return sum + p.installments
          .filter(inst => inst.approved && inst.date >= monthStart && inst.date <= monthEnd)
          .reduce((s, inst) => s + inst.amount, 0);
      }, 0);

      monthlyRevenue.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthlyTotal
      });
    }

    // Top Debtors
    const topDebtors = payments
      .filter(p => p.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10)
      .map(p => ({
        studentName: `${p.studentId?.firstName} ${p.studentId?.surName}`,
        admissionNumber: p.studentId?.admissionNumber,
        classLevel: p.studentId?.classLevel,
        feeType: p.feeType,
        totalAmount: p.totalAmount,
        balance: p.balance,
        session: p.session,
        term: p.term
      }));

    // Recent Payments
    const recentPayments = [];
    payments.forEach(p => {
      p.installments
        .filter(inst => inst.approved)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .forEach(inst => {
          recentPayments.push({
            studentName: `${p.studentId?.firstName} ${p.studentId?.surName}`,
            admissionNumber: p.studentId?.admissionNumber,
            feeType: p.feeType,
            amount: inst.amount,
            method: inst.method,
            date: inst.date,
            approvedBy: inst.approvedBy
          });
        });
    });

    recentPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    const limitedRecentPayments = recentPayments.slice(0, 20);

    res.status(200).json({
      success: true,
      summary: {
        totalFeesExpected,
        totalPaid,
        totalBalance,
        collectionRate: totalFeesExpected > 0 ? ((totalPaid / totalFeesExpected) * 100).toFixed(2) : 0
      },
      statusDistribution,
      feeTypeAnalysis: Object.keys(feeTypeAnalysis).map(type => ({
        feeType: type,
        ...feeTypeAnalysis[type],
        collectionRate: feeTypeAnalysis[type].expected > 0 ? 
          ((feeTypeAnalysis[type].paid / feeTypeAnalysis[type].expected) * 100).toFixed(2) : 0
      })),
      classAnalysis: Object.keys(classAnalysis).map(cls => ({
        classLevel: cls,
        ...classAnalysis[cls],
        collectionRate: classAnalysis[cls].expected > 0 ? 
          ((classAnalysis[cls].paid / classAnalysis[cls].expected) * 100).toFixed(2) : 0
      })),
      methodAnalysis: Object.keys(methodAnalysis).map(method => ({
        method,
        ...methodAnalysis[method],
        percentage: totalPaid > 0 ? ((methodAnalysis[method].amount / totalPaid) * 100).toFixed(2) : 0
      })),
      monthlyRevenue,
      topDebtors,
      recentPayments: limitedRecentPayments
    });

  } catch (error) {
    console.error('Error generating financial reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
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
      reference,
      email,
      name,
    } = req.body;

    // Get the active payment gateway from configuration
    const config = await Config.findOne();
    if (!config) {
      return res.status(500).json({ 
        success: false, 
        message: "Payment configuration not found. Please contact administrator." 
      });
    }

    const activeGateway = config.activePaymentGateway || "flutterwave";
    let paymentLink;

    if (activeGateway === "flutterwave") {
      // Verify Flutterwave configuration
      if (!config.flutterwaveSecret || !config.flutterwavePublic) {
        return res.status(500).json({ 
          success: false, 
          message: "Flutterwave configuration is incomplete. Please contact administrator." 
        });
      }

      const response = await createFlutterwavePayment({
        amount,
        reference,
        email,
        name,
        description,
      });
      paymentLink = response.data.link;
    } else if (activeGateway === "paystack") {
      // Verify Paystack configuration
      if (!config.paystackSecret || !config.paystackPublic) {
        return res.status(500).json({ 
          success: false, 
          message: "Paystack configuration is incomplete. Please contact administrator." 
        });
      }

      const response = await createPaystackPayment({
        amount,
        reference,
        email,
        name,
        description,
      });
      paymentLink = response.data.authorization_url;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payment gateway configuration. Please contact administrator." 
      });
    }

    // ✅ Check if payment exists
    let payment = await Payment.findOne({ studentId, feeType, session, term });

    if (payment) {
      payment.installments.push({ amount, method: activeGateway, reference });
      await payment.save();
    } else {
      payment = new Payment({
        studentId,
        feeType,
        description,
        session,
        term,
        totalAmount,
        installments: [{ amount, method: activeGateway, reference }],
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
        }).populate({
          path: 'studentId',
          populate: {
            path: 'parentId',
            select: 'fullname email phone'
          }
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
            
            // Send real-time notification to parent
            if (payment.studentId && payment.studentId.parentId) {
              try {
                // Create in-app notification
                const Notification = (await import("../models/notification.js")).default;
                await Notification.create({
                  recipient: payment.studentId.parentId._id,
                  sender: null, // System notification
                  type: 'payment',
                  title: 'Payment Confirmed',
                  message: `Payment of ${verification.data.currency} ${verification.data.amount} for ${payment.studentId.fullname} has been successfully processed via Flutterwave.`,
                  data: {
                    studentId: payment.studentId._id,
                    paymentId: payment._id,
                    installmentId: installment._id,
                    amount: verification.data.amount,
                    currency: verification.data.currency,
                    reference: verification.data.tx_ref,
                    gateway: 'flutterwave'
                  },
                  priority: 'high',
                  actionUrl: `/payment-status?reference=${verification.data.tx_ref}`
                });

                // Send email notification
                if (payment.studentId.parentId.email) {
                  const nodemailer = await import('nodemailer');
                  const emailTransporter = nodemailer.default.createTransporter({
                    service: 'gmail',
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                      user: process.env.EMAIL_USER,
                      pass: process.env.EMAIL_PASS
                    }
                  });

                  const emailContent = {
                    from: process.env.EMAIL_USER,
                    to: payment.studentId.parentId.email,
                    subject: 'Payment Confirmation - School Management System',
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">Payment Confirmed!</h2>
                        <p>Dear ${payment.studentId.parentId.fullname},</p>
                        <p>We are pleased to confirm that your payment has been successfully processed.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                          <h3>Payment Details:</h3>
                          <p><strong>Student:</strong> ${payment.studentId.fullname}</p>
                          <p><strong>Amount:</strong> ${verification.data.currency} ${verification.data.amount}</p>
                          <p><strong>Reference:</strong> ${verification.data.tx_ref}</p>
                          <p><strong>Payment Gateway:</strong> Flutterwave</p>
                          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <p>You can view your payment status and download your receipt by clicking the link below:</p>
                        <a href="${process.env.CLIENT_URL}/payment-status?reference=${verification.data.tx_ref}" 
                           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                          View Payment Status
                        </a>
                        
                        <p style="margin-top: 20px;">Thank you for your payment!</p>
                        <p>Best regards,<br>School Management System</p>
                      </div>
                    `
                  };

                  await emailTransporter.sendMail(emailContent);
                  console.log(`Payment confirmation email sent to ${payment.studentId.parentId.email}`);
                }

                console.log(`Real-time notification sent for Flutterwave payment: ${verification.data.tx_ref}`);
              } catch (notificationError) {
                console.error('Error sending payment notification:', notificationError);
                // Don't fail the webhook if notification fails
              }
            }
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
        }).populate({
          path: 'studentId',
          populate: {
            path: 'parentId',
            select: 'fullname email phone'
          }
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
            
            // Send real-time notification to parent
            if (payment.studentId && payment.studentId.parentId) {
              try {
                // Create in-app notification
                const Notification = (await import("../models/notification.js")).default;
                await Notification.create({
                  recipient: payment.studentId.parentId._id,
                  sender: null, // System notification
                  type: 'payment',
                  title: 'Payment Confirmed',
                  message: `Payment of ${verification.data.currency} ${verification.data.amount / 100} for ${payment.studentId.fullname} has been successfully processed via Paystack.`,
                  data: {
                    studentId: payment.studentId._id,
                    paymentId: payment._id,
                    installmentId: installment._id,
                    amount: verification.data.amount / 100,
                    currency: verification.data.currency,
                    reference: reference,
                    gateway: 'paystack'
                  },
                  priority: 'high',
                  actionUrl: `/payment-status?reference=${reference}`
                });

                // Send email notification
                if (payment.studentId.parentId.email) {
                  const nodemailer = await import('nodemailer');
                  const emailTransporter = nodemailer.default.createTransporter({
                    service: 'gmail',
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                      user: process.env.EMAIL_USER,
                      pass: process.env.EMAIL_PASS
                    }
                  });

                  const emailContent = {
                    from: process.env.EMAIL_USER,
                    to: payment.studentId.parentId.email,
                    subject: 'Payment Confirmation - School Management System',
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">Payment Confirmed!</h2>
                        <p>Dear ${payment.studentId.parentId.fullname},</p>
                        <p>We are pleased to confirm that your payment has been successfully processed.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                          <h3>Payment Details:</h3>
                          <p><strong>Student:</strong> ${payment.studentId.fullname}</p>
                          <p><strong>Amount:</strong> ${verification.data.currency} ${verification.data.amount / 100}</p>
                          <p><strong>Reference:</strong> ${reference}</p>
                          <p><strong>Payment Gateway:</strong> Paystack</p>
                          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <p>You can view your payment status and download your receipt by clicking the link below:</p>
                        <a href="${process.env.CLIENT_URL}/payment-status?reference=${reference}" 
                           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                          View Payment Status
                        </a>
                        
                        <p style="margin-top: 20px;">Thank you for your payment!</p>
                        <p>Best regards,<br>School Management System</p>
                      </div>
                    `
                  };

                  await emailTransporter.sendMail(emailContent);
                  console.log(`Payment confirmation email sent to ${payment.studentId.parentId.email}`);
                }

                console.log(`Real-time notification sent for Paystack payment: ${reference}`);
              } catch (notificationError) {
                console.error('Error sending payment notification:', notificationError);
                // Don't fail the webhook if notification fails
              }
            }
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
    ).populate('installments.approvedBy', 'fullname').populate({
      path: 'studentId',
      populate: {
        path: 'parentId',
        select: 'fullname email phone'
      }
    });

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

    // Send real-time notification to parent for manual approval
    if (payment.studentId && payment.studentId.parentId) {
      try {
        // Create in-app notification
        const Notification = (await import("../models/notification.js")).default;
        await Notification.create({
          recipient: payment.studentId.parentId._id,
          sender: adminId,
          type: 'payment',
          title: 'Payment Approved',
          message: `Payment of ${installment.amount} for ${payment.studentId.firstName} ${payment.studentId.surName} has been approved by admin.`,
          data: {
            studentId: payment.studentId._id,
            paymentId: payment._id,
            installmentId: installment._id,
            amount: installment.amount,
            feeType: payment.feeType,
            approvalType: 'manual'
          },
          priority: 'high',
          actionUrl: `/payment-receipt/${payment._id}/${installment._id}`
        });

        // Send email notification
        if (payment.studentId.parentId.email) {
          const nodemailer = await import('nodemailer');
          const emailTransporter = nodemailer.default.createTransporter({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });

          const emailContent = {
            from: process.env.EMAIL_USER,
            to: payment.studentId.parentId.email,
            subject: 'Payment Approved - School Management System',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Payment Approved!</h2>
                <p>Dear ${payment.studentId.parentId.fullname},</p>
                <p>We are pleased to inform you that your payment has been approved by our admin team.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3>Payment Details:</h3>
                  <p><strong>Student:</strong> ${payment.studentId.firstName} ${payment.studentId.surName}</p>
                  <p><strong>Amount:</strong> ₦${installment.amount}</p>
                  <p><strong>Fee Type:</strong> ${payment.feeType}</p>
                  <p><strong>Session:</strong> ${payment.session}</p>
                  <p><strong>Term:</strong> ${payment.term}</p>
                  <p><strong>Approved Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <p>You can download your payment receipt by clicking the link below:</p>
                <a href="${process.env.CLIENT_URL}/payment-receipt/${payment._id}/${installment._id}" 
                   style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Download Receipt
                </a>
                
                <p style="margin-top: 20px;">Thank you for your payment!</p>
                <p>Best regards,<br>School Management System</p>
              </div>
            `
          };

          await emailTransporter.sendMail(emailContent);
          console.log(`Payment approval email sent to ${payment.studentId.parentId.email}`);
        }

        console.log(`Real-time notification sent for manual payment approval: ${payment._id}`);
      } catch (notificationError) {
        console.error('Error sending payment approval notification:', notificationError);
        // Don't fail the approval if notification fails
      }
    }

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

// New endpoint to check payment status by reference
export const getPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required"
      });
    }

    // Find payment by reference
    const payment = await Payment.findOne({ reference })
      .populate('studentId', 'fullname email')
      .populate('installments.approvedBy', 'fullname');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    // Find the specific installment that matches this reference
    const installment = payment.installments.find(inst => 
      inst.reference === reference
    );

    if (!installment) {
      return res.status(404).json({
        success: false,
        message: "Payment installment not found"
      });
    }

    res.status(200).json({
      success: true,
      payment: {
        reference: installment.reference,
        amount: installment.amount,
        status: installment.status,
        method: installment.method,
        paidAt: installment.paidAt,
        student: {
          name: payment.studentId.fullname,
          email: payment.studentId.email
        },
        feeType: payment.feeType,
        description: payment.description,
        session: payment.session,
        term: payment.term
      }
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong"
    });
  }
};
