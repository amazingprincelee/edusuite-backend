import express from "express";
import { addFlutterwaveConfig, addPaystackConfig, getPaymentConfig, updateFlutterwaveConfig, updatePaystackConfig, updateActivePaymentGateway} from "../controllers/configController.js";
const router = express.Router();



router.get("/", getPaymentConfig)
router.post("/add-flutterwave", addFlutterwaveConfig);
router.post("/add-paystack", addPaystackConfig);
router.put("/flutterwave/update", updateFlutterwaveConfig);
router.put("/paystack/update", updatePaystackConfig);
router.put("/active-gateway/update", updateActivePaymentGateway);


export default router;



