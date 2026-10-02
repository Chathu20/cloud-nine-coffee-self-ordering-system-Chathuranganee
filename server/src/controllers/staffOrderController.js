import mongoose from "mongoose";
import Order from "../models/Order.js";
import { ORDER_STATUS, NEXT_STATUS } from "../constants.js";
import AppError from "../utils/AppError.js";
import { notifyOrderChanged } from "../services/orderEvents.js";

const ACTIVE_STATUSES = [ORDER_STATUS.NEW, ORDER_STATUS.PREPARING, ORDER_STATUS.READY];
const COMPLETED_LIMIT = 20;

// What the barista needs on an order card – no prices or payment details
const toBaristaOrder = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  orderType: order.orderType,
  items: order.items.map(({ name, quantity, options }) => ({
    name,
    quantity,
    options: options.map(({ group, name }) => ({ group, name })),
  })),
  status: order.status,
  nextStatus: NEXT_STATUS[order.status] ?? null,
  orderedAt: order.paidAt,
});

// GET /api/staff/orders?view=active|completed
export const getOrders = async (req, res) => {
  const view = req.query.view ?? "active";

  let query;
  if (view === "active") {
    query = Order.find({ status: { $in: ACTIVE_STATUSES } }).sort({ paidAt: 1 });
  } else if (view === "completed") {
    query = Order.find({ status: ORDER_STATUS.COMPLETED })
      .sort({ updatedAt: -1 })
      .limit(COMPLETED_LIMIT);
  } else {
    throw new AppError('view must be "active" or "completed"');
  }

  const orders = await query.lean();

  res.set("Cache-Control", "no-store");
  res.json({ orders: orders.map(toBaristaOrder) });
};

// PATCH /api/staff/orders/:id/status   body: { "from": "NEW" }
export const advanceOrderStatus = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid order id");
  }

  const { from } = req.body ?? {};
  if (typeof from !== "string" || !Object.hasOwn(NEXT_STATUS, from)) {
    throw new AppError("from must be NEW, PREPARING or READY");
  }
  const to = NEXT_STATUS[from];

  // Only updates if the order is STILL at "from" – protects against double taps
  const order = await Order.findOneAndUpdate(
    { _id: id, status: from },
    { $set: { status: to }, $push: { statusHistory: { status: to, at: new Date() } } },
    { returnDocument: "after" }
  ).lean();

  if (!order) {
    const current = await Order.findById(id).select("orderNumber status paymentStatus").lean();
    if (!current || current.paymentStatus !== "PAID") {
      throw new AppError("Order not found", 404);
    }
    throw new AppError(`Order ${current.orderNumber} is already ${current.status}`, 409);
  }

  notifyOrderChanged(order.trackingToken); // other boards + this customer's phone update straight away
  res.json({ order: toBaristaOrder(order) });
};