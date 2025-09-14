import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upload } from "../config/cloudinary.js"; 
import SchoolInfo from "../models/schoolInformation.js"; 
import User from "../models/user.js"; 
import Payment from '../models/payment.js';

// Fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New function to generate receipt
export const generateReceipt = async (paymentId, installmentId) => {
  try {
    console.log(`Generating receipt for payment: ${paymentId}, installment: ${installmentId}`);

    // Fetch payment details
    const payment = await Payment.findById(paymentId).populate('studentId', 'firstName surName admissionNumber classLevel section').populate('installments.approvedBy', 'fullname');
    if (!payment) {
      throw new Error("Payment not found");
    }

    // Find the specific installment
    const installment = payment.installments.id(installmentId);
    if (!installment || !installment.approved) {
      throw new Error("Approved installment not found");
    }

    console.log("Found payment and installment, generating PDF...");

    // Fetch school information
    const schoolInfo = await SchoolInfo.findOne();
    if (!schoolInfo) {
      console.warn("School information not found, using default values");
    }

    // Fetch approver details if approvedBy is a User ID
    const approver = installment.approvedBy ? await User.findById(installment.approvedBy) : null;

    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    // Generate a unique filename for the receipt
    const receiptFilename = `receipt_${paymentId}_${installmentId}_${Date.now()}.pdf`;
    const tempDir = path.join(__dirname, '..', 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log("Created temp directory");
    }
    
    const receiptPath = path.join(tempDir, receiptFilename);

    // Pipe the PDF to a file
    const writeStream = fs.createWriteStream(receiptPath);
    doc.pipe(writeStream);

    // Add school header
    doc.fontSize(20).text(schoolInfo?.schoolName || 'School Name', { align: 'center' });
    doc.fontSize(12).text(schoolInfo?.schoolAddress || 'School Address', { align: 'center' });
    if (schoolInfo?.schoolMotto) {
      doc.fontSize(10).text(`Motto: ${schoolInfo.schoolMotto}`, { align: 'center' });
    }
    doc.moveDown(2);

    // Receipt title
    doc.fontSize(16).text('PAYMENT RECEIPT', { align: 'center', underline: true });
    doc.moveDown();

    // Receipt details
    const receiptData = [
      ['Receipt ID:', installmentId],
      ['Date:', new Date(installment.approvedAt || installment.date).toLocaleDateString()],
      ['Student:', `${payment.studentId.firstName} ${payment.studentId.surName}`],
      ['Admission No:', payment.studentId.admissionNumber || 'N/A'],
      ['Class:', `${payment.studentId.classLevel} - ${payment.studentId.section || ''}`],
      ['Fee Type:', payment.feeType.charAt(0).toUpperCase() + payment.feeType.slice(1)],
      ['Description:', payment.description || 'N/A'],
      ['Session/Term:', `${payment.session} - ${payment.term.charAt(0).toUpperCase() + payment.term.slice(1)}`],
      ['Payment Method:', installment.method.charAt(0).toUpperCase() + installment.method.slice(1)],
    ];

    if (installment.reference) {
      receiptData.push(['Reference:', installment.reference]);
    }

    receiptData.push(
      ['Amount Paid:', `₦${installment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`],
      ['Total Amount:', `₦${payment.totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`],
      ['Balance:', `₦${payment.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`]
    );

    // Display receipt data
    doc.fontSize(12);
    receiptData.forEach(([label, value]) => {
      doc.text(`${label} ${value}`);
    });

    doc.moveDown();

    // Approver info
    if (approver) {
      doc.text(`Approved By: ${approver.fullname}`);
    } else {
      doc.text('Approved By: System');
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your payment.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be written using Promise
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log("PDF generated successfully, uploading to Cloudinary...");

    // Upload PDF to Cloudinary
    const uploadResult = await upload(receiptPath, `receipts/${payment.studentId._id}`);

    if (!uploadResult || !uploadResult.secure_url) {
      throw new Error("Receipt upload failed");
    }

    console.log("Receipt uploaded to Cloudinary:", uploadResult.secure_url);

    // Update receiptUrl in the installment
    installment.receiptUrl = uploadResult.secure_url;
    await payment.save();

    // Clean up temp file
    try {
      fs.unlinkSync(receiptPath);
      console.log("Temp file cleaned up");
    } catch (err) {
      console.warn("Failed to clean up temp file:", err.message);
    }

    return {
      success: true,
      message: "Receipt generated and uploaded successfully",
      receiptUrl: uploadResult.secure_url,
    };
  } catch (error) {
    console.error("Error generating receipt:", error);
    throw error;
  }
};