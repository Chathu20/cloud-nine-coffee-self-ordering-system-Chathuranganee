import Order from "../models/Order.js";
import { ORDER_TYPES, ORDER_STATUS, TIP_PERCENTAGES } from "../constants.js";
import { buildOrderItems, calculateTip } from "../services/pricing.js";
import AppError from "../utils/AppError.js";

// POST /api/orders – validate the cart and create a PENDING_PAYMENT order
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

  res.status(201).json({
    order: {
      id: order._id,
      orderType: order.orderType,
      items: order.items,
      subtotal: order.subtotal,
      tipPercent: order.tipPercent,
      tipAmount: order.tipAmount,
      totalAmount: order.totalAmount,
      status: order.status,
    },
  });
};