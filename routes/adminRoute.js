import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { getAdminDashboard, getAllParents, getParentsWithChildren } from "../controllers/adminController.js";
import { getClass } from "../controllers/classController.js"
import { register } from "../controllers/authcontrollers.js"
import { 
  getAllPayments,
  getStudentBalance,
  getFeesSummary,
  getClassSummary,
  getDebtors,
  getFinancialReports,
} from "../controllers/paymentControllers.js";


const router = express.Router();

router.get("/dashboard", isAuthenticated, isAdmin, getAdminDashboard)
router.get("/payments", isAuthenticated, isAdmin, getAllPayments);         
router.get("/fees/summary", isAuthenticated, isAdmin, getFeesSummary);      
router.get("/fees/class-summary", isAuthenticated, isAdmin, getClassSummary);
router.get("/student/:studentId/balance", isAuthenticated, isAdmin, getStudentBalance); 
router.get("/all-parents", isAuthenticated, isAdmin, getAllParents)
router.get("/parent-withchildren", isAuthenticated, isAdmin, getParentsWithChildren)
router.get("/debtors", isAuthenticated, isAdmin, getDebtors); 
router.get('/all-classes', isAuthenticated, isAdmin, getClass)
router.get("/financial-reports", isAuthenticated, isAdmin, getFinancialReports);

// Test endpoint for debugging authentication
router.get("/test-auth", isAuthenticated, isAdmin, (req, res) => {
  res.json({ 
    success: true, 
    message: "Authentication successful", 
    user: {
      id: req.user._id,
      fullname: req.user.fullname,
      role: req.user.role,
      email: req.user.email
    }
  });
});

router.post("/register-parent", isAuthenticated, isAdmin, register)             

    

export default router;
