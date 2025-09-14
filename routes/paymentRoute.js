import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { manualPayment, paystackWebhook, flutterwaveWebhook, initiatePayment, getAllPayments, approvePayment, getReceipt } from "../controllers/paymentControllers.js"

const router = express.Router()

router.get('/', isAuthenticated, isAdmin, getAllPayments )
// Fix the route to match the frontend call - it should have parameters
router.get('/get-receipt/:paymentId/:installmentId', isAuthenticated, getReceipt)
router.post('/manual-payment', isAuthenticated ,isAdmin, manualPayment);
router.post("/online-payment", initiatePayment );
router.post("/webhook/paystack", paystackWebhook);
router.post("/webhook/flutterwave", flutterwaveWebhook);
router.put("/approve-payment", isAuthenticated, isAdmin, approvePayment)

export default router;