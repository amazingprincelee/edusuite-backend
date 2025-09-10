// models/config.js
import mongoose from "mongoose";

const configSchema = new mongoose.Schema({
  flutterwaveSecret: { type: String},
  flutterwavePublic: {type: String},
  paystackSecret: { type: String},
  paystackPublic: {type: String},
  currency: { type: String, default: "NGN" },
  callbackUrl: { type: String, default: "" }, // global callback
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Config = mongoose.model("Config", configSchema);
export default Config;
