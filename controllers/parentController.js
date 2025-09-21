import Student from "../models/student.js";
import Payment from "../models/payment.js";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import Config from "../models/config.js";

// Get parent's children
export const getParentChildren = async (req, res) => {
  try {
    const parentId = req.user._id;
    
    // Find all children of this parent
    const children = await Student.find({ parentId: parentId })
      .select('firstName surName middleName classLevel section admissionNumber currentSession currentTerm status dateOfBirth gender address stateOfOrigin nationality parentInfo admissionDate studentPhoto')
      .lean();
    
    if (!children || children.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No children found",
        children: []
      });
    }

    res.status(200).json({
      success: true,
      children: children
    });
  } catch (error) {
    console.error("Error fetching parent children:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get payment configuration for parents
export const getPaymentConfig = async (req, res) => {
  try {
    const config = await Config.findOne().select('activePaymentGateway currency');
    
    if (!config) {
      return res.status(200).json({
        success: true,
        config: {
          activePaymentGateway: 'flutterwave', // default
          currency: 'NGN'
        }
      });
    }

    res.status(200).json({
      success: true,
      config: {
        activePaymentGateway: config.activePaymentGateway || 'flutterwave',
        currency: config.currency || 'NGN'
      }
    });
  } catch (error) {
    console.error("Error fetching payment config:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get parent notifications
export const getParentNotifications = async (req, res) => {
  try {
    const parentId = req.user._id;
    
    // Find notifications for this parent
    const notifications = await Notification.find({
      $or: [
        { recipient: parentId },
        { recipientType: 'parent' },
        { recipientType: 'all' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    res.status(200).json({
      success: true,
      notifications: notifications || []
    });
  } catch (error) {
    console.error("Error fetching parent notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get parent payment summary
export const getParentPaymentSummary = async (req, res) => {
  try {
    const parentId = req.user._id;
    
    // Find all children of this parent
    const children = await Student.find({ parentId: parentId }).select('_id');
    const childrenIds = children.map(child => child._id);
    
    if (childrenIds.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          totalPayments: 0,
          totalOutstanding: 0,
          currentTermFees: 0,
          recentPayments: []
        }
      });
    }

    // Find all payments for the children
    const payments = await Payment.find({ studentId: { $in: childrenIds } })
      .populate('studentId', 'firstName surName classLevel admissionNumber')
      .lean();

    // Calculate summary
    const totalPayments = payments.reduce((sum, payment) => {
      return sum + payment.installments
        .filter(inst => inst.approved)
        .reduce((instSum, inst) => instSum + inst.amount, 0);
    }, 0);

    const totalOutstanding = payments.reduce((sum, payment) => {
      return sum + (payment.balance || 0);
    }, 0);

    // Get current term fees (assuming current session/term)
    const currentTermPayments = payments.filter(payment => {
      // You might want to adjust this logic based on your current session/term logic
      return payment.session === new Date().getFullYear().toString();
    });

    const currentTermFees = currentTermPayments.reduce((sum, payment) => {
      return sum + (payment.totalAmount || 0);
    }, 0);

    // Get recent payments (last 5)
    const recentPayments = payments
      .flatMap(payment => 
        payment.installments
          .filter(inst => inst.approved)
          .map(inst => ({
            amount: inst.amount,
            date: inst.approvedAt || inst.date,
            method: inst.method,
            reference: inst.reference,
            studentName: `${payment.studentId.firstName} ${payment.studentId.surName}`,
            feeType: payment.feeType
          }))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    res.status(200).json({
      success: true,
      summary: {
        totalPayments,
        totalOutstanding,
        currentTermFees,
        recentPayments
      }
    });
  } catch (error) {
    console.error("Error fetching parent payment summary:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get parent dashboard overview
export const getParentDashboard = async (req, res) => {
  try {
    const parentId = req.user._id;
    
    // Get children count
    const childrenCount = await Student.countDocuments({ parentId: parentId });
    
    // Get notifications count
    const notificationsCount = await Notification.countDocuments({
      $or: [
        { recipient: parentId },
        { recipientType: 'parent' },
        { recipientType: 'all' }
      ],
      read: false
    });

    // Get payment summary
    const children = await Student.find({ parentId: parentId }).select('_id');
    const childrenIds = children.map(child => child._id);
    
    let paymentSummary = {
      totalOutstanding: 0,
      totalPaid: 0
    };

    if (childrenIds.length > 0) {
      const payments = await Payment.find({ studentId: { $in: childrenIds } });
      
      paymentSummary.totalOutstanding = payments.reduce((sum, payment) => {
        return sum + (payment.balance || 0);
      }, 0);

      paymentSummary.totalPaid = payments.reduce((sum, payment) => {
        return sum + payment.installments
          .filter(inst => inst.approved)
          .reduce((instSum, inst) => instSum + inst.amount, 0);
      }, 0);
    }

    res.status(200).json({
      success: true,
      dashboard: {
        childrenCount,
        notificationsCount,
        paymentSummary
      }
    });
  } catch (error) {
    console.error("Error fetching parent dashboard:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};