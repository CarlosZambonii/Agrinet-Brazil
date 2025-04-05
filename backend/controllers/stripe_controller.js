const Stripe = require("stripe");
const DepositAccount = require("../models/depositAccount");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Agrinet Deposit",
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/deposit-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/deposit-cancel`,
      metadata: { userId: req.user.id, amount: amount.toString() },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Error creating Stripe session" });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const amount = parseFloat(session.metadata.amount);

      let account = await DepositAccount.findOne({ userId });
      if (!account) {
        account = new DepositAccount({ userId });
      }

      account.balance += amount;
      account.transactionHistory.push({ type: "fund", amount, note: "Stripe Payment" });
      await account.save();
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: "Webhook error" });
  }
};
