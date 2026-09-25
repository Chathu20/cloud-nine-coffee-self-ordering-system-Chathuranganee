import Order from "../models/Order.js";
import { ORDER_TYPES, ORDER_STATUS } from "../constants.js";
import { buildOrderItems } from "../services/pricing.js";
import AppError from "../utils/AppError.js";

// POST /api/orders – validate the cart and create a PENDING_PAYMENT order
export const createOrder = async (req, res) => {
  const { orderType, items } = req.body ?? {};

  if (!ORDER_TYPES.includes(orderType)) {
    throw new AppError("Please choose Dine-In or Takeaway");
  }

  const { orderItems, totalAmount } = await buildOrderItems(items);

  const order = await Order.create({
    orderType,
    items: orderItems,
    totalAmount,
    status: ORDER_STATUS.PENDING_PAYMENT,
    statusHistory: [{ status: ORDER_STATUS.PENDING_PAYMENT }],
  });

  res.status(201).json({
    order: {
      id: order._id,
      orderType: order.orderType,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
    },
  });
};