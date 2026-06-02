import 'dotenv/config';
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY. Add it to your .env file or environment variables.");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2026-05-27.dahlia",
});

export default stripe;
