import Order from "../models/Order.js";
import Counter from "../models/Counter.js";
import stripe, { STRIPE_CURRENCY } from "../config/stripe.js";
import { ORDER_TYPES, ORDER_STATUS, TIP_PERCENTAGES } from "../constants.js";
import { buildOrderItems, calculateTip } from "../services/pricing.js";
import AppError from "../utils/AppError.js";
import { notifyOrderChanged, openTrackingStream } from "../services/orderEvents.js";

// Stripe expects the smallest currency unit: LKR 850 → 85000 (cents)
const toStripeAmount = (rupees) => Math.round(rupees * 100);

// One Stripe line per cart line, plus the tip as its own line
const buildLineItems = (order) => {
  const lines = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: STRIPE_CURRENCY,
      unit_amount: toStripeAmount(item.unitPrice),
      product_data: {
        name: item.name,
        ...(item.options.length > 0 && {
          description: item.options.map((o) => o.name).join(", "),
        }),
      },
    },
  }));

  if (order.tipAmount > 0) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: STRIPE_CURRENCY,
        unit_amount: toStripeAmount(order.tipAmount),
        product_data: { name: `Tip (${order.tipPercent}%)` },
      },
    });
  }

  return lines;
};

// Only the fields the customer (confirmation screen / QR) needs
export const toCustomerOrder = (order) => ({
  orderNumber: order.orderNumber,
  orderType: order.orderType,
  items: order.items.map(({ name, quantity, unitPrice, lineTotal, options }) => ({
    name,
    quantity,
    unitPrice,
    lineTotal,
    options: options.map(({ group, name }) => ({ group, name })),
  })),
  subtotal: order.subtotal,
  tipPercent: order.tipPercent,
  tipAmount: order.tipAmount,
  totalAmount: order.totalAmount,
  status: order.status,
  paidAt: order.paidAt,
  trackingToken: order.trackingToken,
});

// POST /api/orders – validate the cart, save a PENDING_PAYMENT order, start Stripe checkout
export const createOrder = async (req, res) => {
  const { orderType, items, tipPercent = 0 } = req.body ?? {};

  if (!ORDER_TYPES.includes(orderType)) {
    throw new AppError("Please choose Dine-In or Takeaway");
  }
  if (!TIP_PERCENTAGES.includes(tipPercent)) {
    throw new AppError(`Tip must be one of: ${TIP_PERCENTAGES.join("%, ")}%`);
  }

  const { orderItems, subtotal } = await buildOrderItems(items);
  const tipAmount = calculateTip(subtotal, tipPercent);
  const totalAmount = subtotal + tipAmount;

  const order = await Order.create({
    orderType,
    items: orderItems,
    subtotal,
    tipPercent,
    tipAmount,
    totalAmount,
    status: ORDER_STATUS.PENDING_PAYMENT,
    statusHistory: [{ status: ORDER_STATUS.PENDING_PAYMENT }],
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: buildLineItems(order),
    client_reference_id: String(order._id),
    metadata: { orderId: String(order._id) },
    success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/cart?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  });

  order.stripeSessionId = session.id;
  await order.save();

  res.status(201).json({
    orderId: order._id,
    totalAmount: order.totalAmount,
    checkoutUrl: session.url,
  });
};

// GET /api/orders/confirm?session_id=cs_test_... – verify payment with Stripe, finalise order
export const confirmPayment = async (req, res) => {
  const sessionId = req.query.session_id;
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    throw new AppError("Invalid payment session");
  }

  let order = await Order.findOne({ stripeSessionId: sessionId });
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.paymentStatus !== "PAID") {
    // Never trust the browser – ask Stripe directly
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new AppError("Payment has not been completed", 402);
    }

    // Atomically claim the order: only ONE request can flip UNPAID → PAID
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "UNPAID" },
      { $set: { paymentStatus: "PAID", paidAt: new Date() } },
      { returnDocument: "after" }
    );

    if (claimed) {
      const seq = await Counter.next("orderNumber");
      claimed.orderNumber = `CN-${String(seq).padStart(4, "0")}`;
      claimed.status = ORDER_STATUS.NEW;
      claimed.statusHistory.push({ status: ORDER_STATUS.NEW });
      await claimed.save();
      order = claimed;
      notifyOrderChanged(claimed.trackingToken); // the new order appears on the barista board
    } else {
      order = await Order.findById(order._id); // another request finalised it first
    }
  }

  res.set("Cache-Control", "no-store");
  res.json({ order: toCustomerOrder(order) });
};

// A tracking token is a UUID v4, e.g. 251a69a1-aa0b-43d1-9914-ce04cf466238
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Safe, price-free view of an order for the public tracking page
const toTrackingView = (order) => ({
  orderNumber: order.orderNumber,
  orderType: order.orderType,
  items: order.items.map(({ name, quantity, options }) => ({
    name,
    quantity,
    options: options.map(({ group, name }) => ({ group, name })),
  })),
  status: order.status,
  timeline: order.statusHistory
    .filter((entry) => entry.status !== ORDER_STATUS.PENDING_PAYMENT)
    .map(({ status, at }) => ({ status, at })),
  paidAt: order.paidAt,
});

// GET /api/orders/track/:token – public order status for the QR tracking page
export const trackOrder = async (req, res) => {
  const { token } = req.params;
  if (!UUID_PATTERN.test(token)) {
    throw new AppError("Invalid tracking link");
  }

  const order = await Order.findOne({ trackingToken: token, paymentStatus: "PAID" }).lean();
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  res.set("Cache-Control", "no-store");
  res.json({ order: toTrackingView(order) });
};
// GET /api/orders/track/:token/events – live "your order changed" messages for the tracking page
export const streamTrackingEvents = async (req, res) => {
  const { token } = req.params;
  if (!UUID_PATTERN.test(token)) {
    throw new AppError("Invalid tracking link");
  }

  // Only open a live connection for a real, paid order
  const exists = await Order.exists({ trackingToken: token, paymentStatus: "PAID" });
  if (!exists) {
    throw new AppError("Order not found", 404);
  }

  openTrackingStream(req, res, token);
};
