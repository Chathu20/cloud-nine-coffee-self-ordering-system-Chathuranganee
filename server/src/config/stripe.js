import Stripe from "stripe";

// Refuse to start with a missing or LIVE key – this project must only use test mode
const key = process.env.STRIPE_SECRET_KEY;
if (!key || !key.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY in .env must be a Stripe TEST key (starts with sk_test_)");
  process.exit(1);
}

export const STRIPE_CURRENCY = "lkr";

const stripe = new Stripe(key);
export default stripe;