import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { addPayment, paystackWebhook, flutterwaveWebhook, initiatePayment, getAllPayments, approvePayment, getReceiptData } from "../controllers/paymentControllers.js"

const router = express.Router()

router.get('/', isAuthenticated, isAdmin, getAllPayments )
// Updated route to get receipt data instead of PDF URL
router.get('/get-receipt-data/:paymentId/:installmentId', isAuthenticated, getReceiptData)
router.post('/add-payment', isAuthenticated ,isAdmin, addPayment);
router.post("/online-payment", initiatePayment );
router.post("/webhook/paystack", paystackWebhook);
router.post("/webhook/flutterwave", flutterwaveWebhook);
router.put("/approve-payment", isAuthenticated, isAdmin, approvePayment)

export default router;