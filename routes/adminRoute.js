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
router.get("/payments", isAdmin, getAllPayments);         
router.get("/fees/summary", isAdmin, getFeesSummary);      
router.get("/fees/class-summary", isAdmin, getClassSummary);
router.get("/student/:studentId/balance", isAdmin, getStudentBalance); 
router.get("/all-parents", isAuthenticated, isAdmin, getAllParents)
router.get("/parent-withchildren", isAuthenticated, isAdmin, getParentsWithChildren)
router.get("/debtors", isAuthenticated, isAdmin, getDebtors); 
router.get('/all-classes', isAuthenticated, isAdmin, getClass)
router.get("/financial-reports", isAuthenticated, isAdmin, getFinancialReports);

router.post("/register-parent", isAuthenticated, isAdmin, register)             

    

export default router;
