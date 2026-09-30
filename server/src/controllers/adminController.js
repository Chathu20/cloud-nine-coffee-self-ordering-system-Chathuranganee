import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Sri Lanka is always UTC+05:30 (no daylight saving)
const TIME_ZONE = "Asia/Colombo";
const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const RECENT_LIMIT = 7;
const TOP_ITEMS_LIMIT = 3;
const CHART_DAYS = 14; // the revenue chart shows the last 14 days (today included)

// Hours always shown on the "busiest hours" chart, even with no orders (7 AM – 9 PM)
const DEFAULT_FIRST_HOUR = 7;
const DEFAULT_LAST_HOUR = 21;

// Midnight today in Sri Lanka, expressed as a UTC Date (how MongoDB stores times)
const startOfTodayInSriLanka = () => {
  const sriLankaNow = new Date(Date.now() + SRI_LANKA_OFFSET_MS);
  sriLankaNow.setUTCHours(0, 0, 0, 0);
  return new Date(sriLankaNow.getTime() - SRI_LANKA_OFFSET_MS);
};

// A UTC Date → its Sri Lanka calendar day as "2026-09-29"
const sriLankaDayKey = (date) => new Date(date.getTime() + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);

// GET /api/admin/dashboard
export const getDashboard = async (req, res) => {
  const startOfToday = startOfTodayInSriLanka();
  const chartStart = new Date(startOfToday.getTime() - (CHART_DAYS - 1) * DAY_MS);

  // One trip to the database: $facet runs several small reports over the same paid orders
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

        // One row per Sri Lanka calendar day (days with no orders are filled in below)
        daily: [
          { $match: { paidAt: { $gte: chartStart } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TIME_ZONE } },
              orders: { $sum: 1 },
              revenue: { $sum: "$subtotal" },
              tips: { $sum: "$tipAmount" },
            },
          },
        ],

        // Orders per hour of the day (Sri Lanka time) over the same 14 days
        hourly: [
          { $match: { paidAt: { $gte: chartStart } } },
          { $group: { _id: { $hour: { date: "$paidAt", timezone: TIME_ZONE } }, orders: { $sum: 1 } } },
        ],

        // Best sellers (all time) with the product photo from the products collection
        topItems: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              name: { $first: "$items.name" },
              quantity: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.lineTotal" },
            },
          },
          { $sort: { quantity: -1, name: 1 } },
          { $limit: TOP_ITEMS_LIMIT },
          { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "product" } },
          {
            $project: {
              _id: 0,
              name: 1,
              quantity: 1,
              revenue: 1,
              image: { $ifNull: [{ $first: "$product.image" }, ""] },
            },
          },
        ],

        recent: [
          { $sort: { paidAt: -1 } },
          { $limit: RECENT_LIMIT },
          { $project: { _id: 0, orderNumber: 1, orderType: 1, totalAmount: 1, status: 1, paidAt: 1 } },
        ],
      },
    },
  ]);

  const today = stats.today[0] ?? { orders: 0, revenue: 0, tips: 0, dineIn: 0, takeaway: 0 };

  // Fill every day of the chart, so a quiet day shows as 0 instead of disappearing
  const dailyByKey = new Map(stats.daily.map((day) => [day._id, day]));
  const dailySales = Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = sriLankaDayKey(new Date(chartStart.getTime() + i * DAY_MS));
    const day = dailyByKey.get(date);
    return { date, orders: day?.orders ?? 0, revenue: day?.revenue ?? 0, tips: day?.tips ?? 0 };
  });

  // Hours: the normal opening hours, stretched if orders came in earlier or later
  const hourlyByHour = new Map(stats.hourly.map((row) => [row._id, row.orders]));
  const hoursWithOrders = [...hourlyByHour.keys()];
  const firstHour = Math.min(DEFAULT_FIRST_HOUR, ...hoursWithOrders);
  const lastHour = Math.max(DEFAULT_LAST_HOUR, ...hoursWithOrders);
  const ordersByHour = [];
  for (let hour = firstHour; hour <= lastHour; hour += 1) {
    ordersByHour.push({ hour, orders: hourlyByHour.get(hour) ?? 0 });
  }

  res.set("Cache-Control", "no-store");
  res.json({
    totalOrders: stats.total[0]?.count ?? 0,
    todayOrders: today.orders,
    todayRevenue: today.revenue,
    todayTips: today.tips,
    dineInOrders: today.dineIn,
    takeawayOrders: today.takeaway,
    dailySales,
    ordersByHour,
    topItems: stats.topItems,
    recentOrders: stats.recent,
  });
};