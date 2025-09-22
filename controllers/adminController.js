import Payment from "../models/payment.js";
import Student from "../models/student.js";
import User from "../models/user.js";


export const getAdminDashboard = async (req, res) => {
   
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

export const getAllParents = async (req, res) => {
  try {
    const parents = await User.find({ role: "parent" });

    if (!parents || parents.length === 0) {
      return res.status(404).json({ message: "No parents found" });
    }

    res.status(200).json({
      success: true,
      count: parents.length,
      parents,
    });
  } catch (error) {
    console.error("Error fetching parents:", error);
    res.status(500).json({ message: "Server error", error });
  }
};


export const getParentsWithChildren = async (req, res) => {
  try {
    
    // Find all parents
    console.log("Searching for parents...");
    const parents = await User.find({ role: "parent" }).lean();
    console.log("Found parents count:", parents ? parents.length : 0);

    if (!parents || parents.length === 0) {
      console.log("No parents found, returning empty array");
      return res.status(200).json({ 
        message: "No parents found", 
        parents: [] 
      });
    }

    
    // Attach children to each parent
    const parentsWithChildren = await Promise.all(
      parents.map(async (parent) => {
        const children = await Student.find({ parentId: parent._id }).lean();
        console.log(`Parent ${parent.fullname} has ${children.length} children`);
        return {
          ...parent,
          children, // attach the student's list here
        };
      })
    );

    res.status(200).json({
      success: true,
      count: parentsWithChildren.length,
      parents: parentsWithChildren,
    });
  } catch (error) {
    console.error("Error fetching parents with children:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
