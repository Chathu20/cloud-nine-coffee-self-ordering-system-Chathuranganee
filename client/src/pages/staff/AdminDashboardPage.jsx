import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { formatLKR } from "../../utils/format";

const REFRESH_MS = 30000; // sales figures don't need to be second-by-second

const STATUS_LABEL = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
};

const STATUS_STYLE = {
  NEW: "bg-coffee/10 text-coffee",
  PREPARING: "bg-forest/10 text-forest",
  READY: "bg-gold/25 text-espresso",
  COMPLETED: "bg-espresso/10 text-espresso/70",
};

const formatTime = (date) =>
  new Date(date).toLocaleString("en-LK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// One headline number
function StatTile({ label, value, note }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-latte/30">
      <p className="text-sm font-medium text-espresso/60">{label}</p>
      <p className="mt-1 text-3xl font-bold text-espresso">{value}</p>
      {note && <p className="mt-1 text-sm text-espresso/50">{note}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/dashboard");
      setStats(data);
      setError("");
      setUpdatedAt(new Date());
    } catch (err) {
      if (err.response?.status !== 401) setError("Couldn't load the dashboard. Retrying…");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-coffee">Dashboard</h1>
          <p className="text-sm text-espresso/60">
            Today (Sri Lanka time){updatedAt && ` · updated ${updatedAt.toLocaleTimeString("en-LK", { hour: "numeric", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-latte px-4 py-2 text-sm font-semibold text-coffee hover:bg-latte/20"
          >
            Refresh
          </button>
          <Link
            to="/admin/menu"
            className="rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            Manage menu →
          </Link>
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
          {/* Headline numbers */}
          <section aria-label="Today's figures" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Orders today" value={stats.todayOrders} note={`${stats.totalOrders} paid orders in total`} />
            <StatTile label="Sales today" value={formatLKR(stats.todayRevenue)} note="Items only, before tips" />
            <StatTile label="Tips today" value={formatLKR(stats.todayTips)} note="Goes to the baristas" />
            <StatTile
              label="Dine-In · Takeaway"
              value={`${stats.dineInOrders} · ${stats.takeawayOrders}`}
              note="Today's orders by type"
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Most ordered */}
            <section className="rounded-3xl bg-espresso p-6 text-cream shadow-sm">
              <h2 className="text-sm font-medium uppercase tracking-widest text-cream/60">Most ordered item</h2>
              {stats.mostOrderedItem ? (
                <>
                  <p className="mt-3 font-display text-3xl text-gold-light">{stats.mostOrderedItem.name}</p>
                  <p className="mt-1 text-cream/70">{stats.mostOrderedItem.quantity} sold (all time)</p>
                </>
              ) : (
                <p className="mt-3 text-cream/70">No orders yet.</p>
              )}
            </section>

            {/* Recent orders */}
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-latte/30 lg:col-span-2">
              <h2 className="mb-3 text-lg font-bold text-coffee">Recent orders</h2>
              {stats.recentOrders.length === 0 ? (
                <p className="py-6 text-center text-espresso/50">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-espresso/50">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Order</th>
                        <th className="py-2 pr-4 font-medium">Paid</th>
                        <th className="py-2 pr-4 font-medium">Type</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-latte/30">
                      {stats.recentOrders.map((order) => (
                        <tr key={order.orderNumber}>
                          <td className="py-2.5 pr-4 font-semibold text-espresso">{order.orderNumber}</td>
                          <td className="py-2.5 pr-4 text-espresso/70">{formatTime(order.paidAt)}</td>
                          <td className="py-2.5 pr-4 text-espresso/70">
                            {order.orderType === "TAKEAWAY" ? "Takeaway" : "Dine-In"}
                          </td>
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
            </section>
          </div>
        </>
      )}
    </main>
  );
}