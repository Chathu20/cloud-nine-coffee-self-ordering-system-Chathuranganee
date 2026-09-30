import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import LiveClock from "../../components/LiveClock";
import { AreaChart, ColumnChart, MiniBars, Sparkline } from "../../components/staff/Charts";
import { formatLKR } from "../../utils/format";

const REFRESH_MS = 30000; // sales figures don't need to be second-by-second
const TIME_ZONE = "Asia/Colombo";

// Theme colours (defined once in index.css) – used by the big SVG charts
const COLOR = {
  rust: "var(--color-rust)",
  peach: "var(--color-peach)",
};

const STATUS_LABEL = { NEW: "New", PREPARING: "Preparing", READY: "Ready", COMPLETED: "Completed" };
const STATUS_STYLE = {
  NEW: "bg-rust/10 text-rust",
  PREPARING: "bg-forest/10 text-forest",
  READY: "bg-gold/25 text-espresso",
  COMPLETED: "bg-espresso/10 text-espresso/70",
};

// Circle colours for the top 3 items (from the design: caramel → sienna → deep roast)
const RANK_STYLE = ["bg-peach", "bg-sienna", "bg-rust"];

// Small line icons for the stat cards
const ICON_PATHS = {
  orders: "M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9.5 8h5M9.5 12h5",
  sales: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 10v.01M17.5 14v.01",
  tips: "M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z",
  cup: "M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2",
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
function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-3xl bg-foam p-5 md:p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="font-semibold text-espresso">{title}</h2>
        {subtitle && <p className="text-sm text-espresso/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// The four stat cards each have their own background colour.
// Light text on the dark cards, dark text on the light cards, so everything stays easy to read.
const TILE_THEMES = {
  green: {
    card: "bg-forest text-cream",
    muted: "text-cream/75",
    faint: "text-cream/60",
    badge: "bg-white/10 text-gold-light",
    chart: "var(--color-gold-light)",
  },
  brown: {
    card: "bg-coffee text-cream",
    muted: "text-cream/75",
    faint: "text-cream/60",
    badge: "bg-white/10 text-gold-light",
    chart: "var(--color-peach)",
  },
  cream: {
    card: "bg-cream text-espresso ring-1 ring-latte/40",
    muted: "text-espresso/65",
    faint: "text-espresso/50",
    badge: "bg-coffee/10 text-coffee",
    chart: "var(--color-sienna)",
  },
  gold: {
    card: "bg-gold text-espresso",
    muted: "text-espresso/75",
    faint: "text-espresso/65",
    badge: "bg-white/30 text-espresso",
    chart: "var(--color-espresso)",
  },
};

// Coloured icon square at the top of each stat card
function IconBadge({ name, className }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICON_PATHS[name]} />
      </svg>
    </span>
  );
}

// One headline number with an icon and a tiny 14-day chart under it.
// renderChart receives the card's chart colour, so the mini chart always matches the card.
function StatTile({ label, value, note, icon, theme, renderChart }) {
  const t = TILE_THEMES[theme];
  return (
    <div className={`flex flex-col rounded-3xl p-5 shadow-sm ${t.card}`}>
      <div className="flex items-center gap-3">
        <IconBadge name={icon} className={t.badge} />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${t.muted}`}>{label}</p>
          <p className={`text-xs ${t.faint}`}>Chart: last 14 days</p>
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {note && <p className={`text-xs ${t.faint}`}>{note}</p>}
      <div className="mt-auto pt-3">{renderChart(t.chart)}</div>
    </div>
  );
}

// Dine-In vs Takeaway as one split bar. Numbers are always written, so colour is never the only clue.
function OrderTypeTile({ dineIn, takeaway, theme }) {
  const t = TILE_THEMES[theme];
  const total = dineIn + takeaway;
  const dinePercent = total === 0 ? 50 : Math.round((dineIn / total) * 100);

  return (
    <div className={`flex flex-col rounded-3xl p-5 shadow-sm ${t.card}`}>
      <div className="flex items-center gap-3">
        <IconBadge name="cup" className={t.badge} />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${t.muted}`}>Dine-In vs Takeaway</p>
          <p className={`text-xs ${t.faint}`}>Today's orders</p>
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold">{total === 0 ? "—" : `${dinePercent}% dine-in`}</p>
      <div className="mt-auto space-y-2 pt-3">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {total === 0 ? (
            <div className="w-full bg-white/30" />
          ) : (
            <>
              {dineIn > 0 && <div className="bg-espresso" style={{ width: `${dinePercent}%` }} />}
              {takeaway > 0 && <div className="flex-1 bg-cream" />}
            </>
          )}
        </div>
        <div className="flex justify-between text-xs">
          <p className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-espresso" aria-hidden="true" />
            <span className={t.muted}>Dine-In</span>
            <span className="font-bold">{dineIn}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cream ring-1 ring-espresso/30" aria-hidden="true" />
            <span className={t.muted}>Takeaway</span>
            <span className="font-bold">{takeaway}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Product photo in a circle, or a coloured circle with the first letter (like the design)
function ItemThumb({ src, name, rank }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={name}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${RANK_STYLE[rank] ?? "bg-latte"}`}
      >
        {name.charAt(0).toUpperCase()}
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

  // The busiest hour, written in the chart's subtitle (so it isn't shown by colour alone)
  const peak = stats?.ordersByHour.reduce((best, h) => (h.orders > (best?.orders ?? 0) ? h : best), null);

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
          {/* Row 1: today's numbers – green, brown, cream and gold cards */}
          <section aria-label="Today's figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Orders today"
              value={stats.todayOrders}
              note={`${stats.totalOrders} paid in total`}
              icon="orders"
              theme="green"
              renderChart={(color) => <MiniBars values={stats.dailySales.map((d) => d.orders)} color={color} />}
            />
            <StatTile
              label="Sales today"
              value={formatLKR(stats.todayRevenue)}
              note="Items, before tips"
              icon="sales"
              theme="brown"
              renderChart={(color) => <Sparkline values={stats.dailySales.map((d) => d.revenue)} color={color} />}
            />
            <StatTile
              label="Tips today"
              value={formatLKR(stats.todayTips)}
              note="For the baristas"
              icon="tips"
              theme="cream"
              renderChart={(color) => <MiniBars values={stats.dailySales.map((d) => d.tips)} color={color} />}
            />
            <OrderTypeTile dineIn={stats.dineInOrders} takeaway={stats.takeawayOrders} theme="gold" />
          </section>

          {/* Row 2: revenue chart + best sellers */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="Revenue"
              subtitle={`${formatLKR(stats.dailySales.reduce((sum, d) => sum + d.revenue, 0))} · last 14 days (items, before tips)`}
            >
              <AreaChart
                label="Revenue per day for the last 14 days"
                formatValue={formatLKR}
                color={COLOR.rust}
                fill={COLOR.peach}
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
                      <ItemThumb src={item.image} name={item.name} rank={index} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-espresso">{item.name}</p>
                        <p className="text-sm text-espresso/50">{item.quantity} sold</p>
                      </div>
                      <p className="shrink-0 font-semibold text-coffee">{formatLKR(item.revenue)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {/* Row 3: busiest hours + recent orders */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-2"
              title="Busiest hours"
              subtitle={
                peak
                  ? `Busiest: ${hourLabel(peak.hour)} (${peak.orders} orders) · last 14 days`
                  : "Orders per hour · last 14 days"
              }
            >
              <ColumnChart
                height={300}
                label="Orders per hour of the day over the last 14 days"
                unit="orders"
                color={COLOR.peach}
                peakColor={COLOR.rust}
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