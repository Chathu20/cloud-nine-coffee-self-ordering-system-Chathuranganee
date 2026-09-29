import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import LiveClock from "../../components/LiveClock";
import { AreaChart, ColumnChart, MiniBars, Sparkline } from "../../components/staff/Charts";
import { formatLKR } from "../../utils/format";

const REFRESH_MS = 30000; // sales figures don't need to be second-by-second
const TIME_ZONE = "Asia/Colombo";

const STATUS_LABEL = { NEW: "New", PREPARING: "Preparing", READY: "Ready", COMPLETED: "Completed" };
const STATUS_STYLE = {
  NEW: "bg-sienna/10 text-sienna",
  PREPARING: "bg-forest/10 text-forest",
  READY: "bg-gold/25 text-espresso",
  COMPLETED: "bg-espresso/10 text-espresso/70",
};

// "2026-09-29" → "29 Sep"
const dayLabel = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// 9 → "9 AM", 12 → "12 PM", 15 → "3 PM"
const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;

const orderTime = (date) =>
  new Date(date).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: TIME_ZONE });

// Greeting by the hour in Sri Lanka
const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(new Date()));
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// A soft rounded card, like in the design
function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-3xl bg-foam p-5 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-espresso">{title}</h2>
            {subtitle && <p className="text-sm text-espresso/50">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// One headline number with a tiny 14-day chart under it
function StatTile({ label, value, note, chart }) {
  return (
    <div className="flex flex-col rounded-3xl bg-foam p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-espresso/60">{label}</p>
        <p className="text-xs text-espresso/40">14 days</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-espresso">{value}</p>
      {note && <p className="text-xs text-espresso/45">{note}</p>}
      <div className="mt-auto pt-3">{chart}</div>
    </div>
  );
}

// Dine-In vs Takeaway as one split bar. Numbers are always written, so colour is never the only clue.
function OrderTypeTile({ dineIn, takeaway }) {
  const total = dineIn + takeaway;
  const dinePercent = total === 0 ? 50 : Math.round((dineIn / total) * 100);

  return (
    <div className="rounded-3xl bg-foam p-5">
      <p className="text-sm font-medium text-espresso/60">Dine-In vs Takeaway</p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {total === 0 ? (
          <div className="w-full bg-espresso/10" />
        ) : (
          <>
            {dineIn > 0 && <div className="bg-sienna" style={{ width: `${dinePercent}%` }} />}
            {takeaway > 0 && <div className="flex-1 bg-honey" />}
          </>
        )}
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sienna" aria-hidden="true" />
          <span className="text-espresso/60">Dine-In</span>
          <span className="font-bold text-espresso">{dineIn}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-honey" aria-hidden="true" />
          <span className="text-espresso/60">Takeaway</span>
          <span className="font-bold text-espresso">{takeaway}</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-espresso/45">Today's orders</p>
    </div>
  );
}

// Product photo in a circle, or a cup if the product has no photo yet
function ItemThumb({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={name} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-latte/40 text-xl">
        ☕
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-full object-cover" />;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get("/admin/dashboard");
      setStats(data);
      setError("");
      setUpdatedAt(new Date());
    } catch (err) {
      if (err.response?.status !== 401) setError("Couldn't load the dashboard. Retrying…");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const firstName = user.name.split(" ")[0];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* Greeting + clock */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-coffee md:text-3xl">
            {greeting()}, {firstName}!
          </h1>
          <p className="text-sm text-espresso/50">
            Here's how Cloud Nine is doing
            {updatedAt &&
              ` · updated ${updatedAt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TIME_ZONE })}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock variant="pill" />
          <button
            type="button"
            onClick={load}
            aria-label="Refresh dashboard"
            title="Refresh"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-foam text-coffee transition hover:bg-latte/30"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">
          {error}
        </p>
      )}

      {!stats ? (
        !error && <p className="py-20 text-center text-espresso/60">Loading dashboard…</p>
      ) : (
        <>
          {/* Row 1: revenue chart + best sellers */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="Revenue"
              subtitle={`${formatLKR(stats.dailySales.reduce((sum, d) => sum + d.revenue, 0))} · last 14 days (items, before tips)`}
            >
              <AreaChart
                label="Revenue per day for the last 14 days"
                formatValue={formatLKR}
                data={stats.dailySales.map((d) => ({
                  label: dayLabel(d.date),
                  value: d.revenue,
                  detail: `${d.orders} order${d.orders === 1 ? "" : "s"}`,
                }))}
              />
              {/* Same numbers as a table for screen readers */}
              <table className="sr-only">
                <caption>Revenue per day</caption>
                <tbody>
                  {stats.dailySales.map((d) => (
                    <tr key={d.date}>
                      <th>{dayLabel(d.date)}</th>
                      <td>{formatLKR(d.revenue)}</td>
                      <td>{d.orders} orders</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="lg:col-span-2" title="Top selling items" subtitle="All time">
              {stats.topItems.length === 0 ? (
                <p className="py-10 text-center text-espresso/50">No orders yet.</p>
              ) : (
                <ol className="space-y-5">
                  {stats.topItems.map((item, index) => (
                    <li key={item.name} className="flex items-center gap-4">
                      <ItemThumb src={item.image} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-espresso">
                          <span className="text-espresso/40">{index + 1}. </span>
                          {item.name}
                        </p>
                        <p className="text-sm text-espresso/50">{item.quantity} sold</p>
                      </div>
                      <p className="shrink-0 font-semibold text-espresso">{formatLKR(item.revenue)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {/* Row 2: today's numbers */}
          <section aria-label="Today's figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Orders today"
              value={stats.todayOrders}
              note={`${stats.totalOrders} paid in total`}
              chart={<MiniBars values={stats.dailySales.map((d) => d.orders)} />}
            />
            <StatTile
              label="Sales today"
              value={formatLKR(stats.todayRevenue)}
              note="Items, before tips"
              chart={<Sparkline values={stats.dailySales.map((d) => d.revenue)} />}
            />
            <StatTile
              label="Tips today"
              value={formatLKR(stats.todayTips)}
              note="For the baristas"
              chart={<MiniBars values={stats.dailySales.map((d) => d.tips)} />}
            />
            <OrderTypeTile dineIn={stats.dineInOrders} takeaway={stats.takeawayOrders} />
          </section>

          {/* Row 3: busiest hours + recent orders */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2" title="Busiest hours" subtitle="Orders per hour · last 14 days">
              <ColumnChart
                height={300}
                label="Orders per hour of the day over the last 14 days"
                unit="orders"
                data={stats.ordersByHour.map((h) => ({ label: hourLabel(h.hour), value: h.orders }))}
              />
            </Card>

            <Card className="lg:col-span-3" title="Recent orders" subtitle="Latest paid orders">
              {stats.recentOrders.length === 0 ? (
                <p className="py-10 text-center text-espresso/50">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-espresso/45">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">Order</th>
                        <th className="pb-2 pr-4 font-medium">Paid</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-latte/25">
                      {stats.recentOrders.map((order) => (
                        <tr key={order.orderNumber}>
                          <td className="py-2.5 pr-4 font-semibold text-espresso">{order.orderNumber}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-espresso/60">{orderTime(order.paidAt)}</td>
                          <td className="py-2.5 pr-4 text-espresso/60">{order.orderType === "TAKEAWAY" ? "Takeaway" : "Dine-In"}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status] ?? ""}`}>
                              {STATUS_LABEL[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-espresso">{formatLKR(order.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </main>
  );
}