import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import { getAdminDashboard } from "../controllers/adminController.js"
import { 
  getAllPayments,
  getStudentBalance,
  getFeesSummary,
  getClassSummary,
  getDebtors,
} from "../controllers/paymentControllers.js";


const router = express.Router();

router.get("/dashboard", isAdmin, getAdminDashboard)
router.get("/payments", isAdmin, getAllPayments);         
router.get("/fees/summary", isAdmin, getFeesSummary);      
router.get("/fees/class-summary", isAdmin, getClassSummary);
router.get("/student/:studentId/balance", isAdmin, getStudentBalance); 
router.get("/debtors", isAdmin, getDebtors);              

    

export default router;
