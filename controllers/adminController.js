import Payment from "../models/payment.js";
import Student from "../models/student.js";


export const getAdminDashboard = async (req, res) => {
   console.log("I got hit");
   

  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: /active/i });
    const graduatedStudents = await Student.countDocuments({ status: /graduated/i });

    const payments = await Payment.find();

    const totalFeesExpected = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) =>
      sum + p.installments.reduce((s, inst) => s + inst.amount, 0), 0);
    const outstanding = totalFeesExpected - totalPaid;

    // recent 5 payments
    const recentPayments = await Payment.find()
      .populate("studentId", "firstName surName classLevel admissionNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      totalStudents,
      activeStudents,
      graduatedStudents,
      totalFeesExpected,
      totalPaid,
      outstanding,
      recentPayments
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    res.status(500).json({ success: false, message: "Internal Server Errorsss" });
  }
};
