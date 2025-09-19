import express from "express";
import { 
  getParentChildren, 
  getParentNotifications, 
  getParentPaymentSummary,
  getParentDashboard 
} from "../controllers/parentController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

// All parent routes require authentication
router.use(isAuthenticated);

// Parent dashboard routes
router.get("/dashboard", getParentDashboard);
router.get("/children", getParentChildren);
router.get("/notifications", getParentNotifications);
router.get("/payment-summary", getParentPaymentSummary);

export default router;