// models/config.js
import mongoose from "mongoose";

const configSchema = new mongoose.Schema({
  flutterwaveSecret: { type: String},
  flutterwavePublic: {type: String},
  paystackSecret: { type: String},
  paystackPublic: {type: String},
  activePaymentGateway: { type: String, enum: ["flutterwave", "paystack"], default: "flutterwave" },
  currency: { type: String, default: "NGN" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Config = mongoose.model("Config", configSchema);
export default Config;
