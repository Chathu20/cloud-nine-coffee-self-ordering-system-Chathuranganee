import mongoose from "mongoose";
import { ORDER_TYPES, ORDER_STATUS, PAYMENT_STATUS, TIP_PERCENTAGES } from "../constants.js";
import crypto from "node:crypto";

// Snapshot of one chosen option at the time of purchase
const orderOptionSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    name: { type: String, required: true },
    priceDelta: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Snapshot of one cart line
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    options: [orderOptionSchema],
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true },
        trackingToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomUUID(),
    },
    orderType: { type: String, required: true, enum: ORDER_TYPES },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },

    // Money (whole rupees)
    subtotal: { type: Number, required: true, min: 0 },          // items only
    tipPercent: { type: Number, enum: TIP_PERCENTAGES, default: 0 },
    tipAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },       // subtotal + tip

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING_PAYMENT,
    },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: "UNPAID" },
    stripeSessionId: { type: String, index: true },
    paidAt: { type: Date },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

// Speeds up the barista board ("all NEW/PREPARING/READY orders, oldest first")
orderSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model("Order", orderSchema);