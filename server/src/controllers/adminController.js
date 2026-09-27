import Order from "../models/Order.js";

// Sri Lanka is always UTC+05:30 (no daylight saving)
const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RECENT_LIMIT = 10;

// Midnight today in Sri Lanka, expressed as a UTC Date (how MongoDB stores times)
const startOfTodayInSriLanka = () => {
  const sriLankaNow = new Date(Date.now() + SRI_LANKA_OFFSET_MS);
  sriLankaNow.setUTCHours(0, 0, 0, 0);
  return new Date(sriLankaNow.getTime() - SRI_LANKA_OFFSET_MS);
};

// GET /api/admin/dashboard
export const getDashboard = async (req, res) => {
  const startOfToday = startOfTodayInSriLanka();

  const [stats] = await Order.aggregate([
    { $match: { paymentStatus: "PAID" } },
    {
      $facet: {
        total: [{ $count: "count" }],

        today: [
          { $match: { paidAt: { $gte: startOfToday } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue: { $sum: "$subtotal" },
              tips: { $sum: "$tipAmount" },
              dineIn: { $sum: { $cond: [{ $eq: ["$orderType", "DINE_IN"] }, 1, 0] } },
              takeaway: { $sum: { $cond: [{ $eq: ["$orderType", "TAKEAWAY"] }, 1, 0] } },
            },
          },
        ],

        mostOrdered: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              name: { $first: "$items.name" },
              quantity: { $sum: "$items.quantity" },
            },
          },
          { $sort: { quantity: -1, name: 1 } },
          { $limit: 1 },
        ],

        recent: [
          { $sort: { paidAt: -1 } },
          { $limit: RECENT_LIMIT },
          {
            $project: {
              _id: 0,
              orderNumber: 1,
              orderType: 1,
              totalAmount: 1,
              status: 1,
              paidAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const today = stats.today[0] ?? { orders: 0, revenue: 0, tips: 0, dineIn: 0, takeaway: 0 };
  const top = stats.mostOrdered[0];

  res.set("Cache-Control", "no-store");
  res.json({
    totalOrders: stats.total[0]?.count ?? 0,
    todayOrders: today.orders,
    todayRevenue: today.revenue,
    todayTips: today.tips,
    dineInOrders: today.dineIn,
    takeawayOrders: today.takeaway,
    mostOrderedItem: top ? { name: top.name, quantity: top.quantity } : null,
    recentOrders: stats.recent,
  });
};