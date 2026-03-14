const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createPixPayment({ amount, userId }) {
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error("Invalid amount");
    err.statusCode = 400;
    throw err;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // centavos
    currency: "brl",
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never"
    },
    metadata: {
      userId
    }
  });

  return paymentIntent;
}

module.exports = {
  createPixPayment
};
