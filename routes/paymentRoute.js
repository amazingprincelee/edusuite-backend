import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js"
import { cashPayment, paystackWebhook, flutterwaveWebhook, initiatePayment } from "../controllers/paymentControllers.js"

const router = express.Router()


router.post('/manual', isAdmin, cashPayment);
router.post("/online-payment", initiatePayment );
router.post("/webhook/paystack", paystackWebhook);
router.post("/webhook/flutterwave", flutterwaveWebhook);


export default router;