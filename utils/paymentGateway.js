import axios from "axios";
import Config from "../models/config.js";
import { config } from "dotenv";

const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

const getConfig = async () => {
  const config = await Config.findOne();
  if (!config) throw new Error("Payment configuration not found");
  return config;
};

export const createFlutterwavePayment = async (payload) => {
  const config = await getConfig();

  const response = await axios.post(
    `${FLW_BASE_URL}/payments`,

    {
      tx_ref: payload.reference,
      amount: payload.amount,
      currency: config.currency,
      redirect_url: config.callbackUrl,
      customer: {
        email: payload.email,
        name: payload.name,
      },
      customizations: {
        title: "School Fees Payment",
        description: payload.description,
      },
    },

    {
        headers: {Authorization: `Bearer ${config.flutterwaveSecret}`}
    }
  );

  return response.data;
};

export const createPaystackPayment = async (payload) => {
    const config = await getConfig();

    const response = axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,

        {
      reference: payload.reference,
      amount: payload.amount * 100, // Paystack requires kobo
      currency: config.currency,
      callback_url: config.callbackUrl,
      email: payload.email,
      metadata: {
        custom_fields: [
          {
            display_name: "Student",
            variable_name: "student",
            value: payload.name,
        
          },
        ],
      },
    },
    {
      headers: { Authorization: `Bearer ${config.paystackSecret}` },
    }

    );
}
