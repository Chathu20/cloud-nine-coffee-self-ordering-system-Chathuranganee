import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/client";
import OrderCard from "../../components/staff/OrderCard";
import AvailabilityPanel from "../../components/staff/AvailabilityPanel";

const REFRESH_MS = 5000; // new orders appear within 5 seconds
const NEW_HIGHLIGHT_MS = 15000; // how long a just-arrived order glows

const COLUMNS = [
  { status: "NEW", title: "New", empty: "No new orders", accent: "border-coffee" },
  { status: "PREPARING", title: "Preparing", empty: "Nothing being made", accent: "border-forest" },
  { status: "READY", title: "Ready to collect", empty: "Nothing waiting", accent: "border-gold" },
];

const TABS = [
  { id: "orders", label: "Orders" },
  { id: "completed", label: "Completed" },
  { id: "availability", label: "Menu availability" },
];

export default function BaristaBoardPage() {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [newIds, setNewIds] = useState(() => new Set());

  const knownIds = useRef(null); // orders we've already seen (null = first load)

  const loadActive = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/orders", { params: { view: "active" } });

      // Glow any order we haven't seen before (not on the very first load)
      if (knownIds.current) {
        const arrived = data.orders.filter((o) => !knownIds.current.has(o.id)).map((o) => o.id);
        if (arrived.length > 0) {
          setNewIds((current) => new Set([...current, ...arrived]));
          setTimeout(() => {
            setNewIds((current) => new Set([...current].filter((id) => !arrived.includes(id))));
          }, NEW_HIGHLIGHT_MS);
        }
      }
      knownIds.current = new Set(data.orders.map((o) => o.id));

      setOrders(data.orders);
      setOffline(false);
    } catch (err) {
      // 401 is handled by the login system (it logs out); anything else = connection trouble
      if (err.response?.status !== 401) setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCompleted = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/orders", { params: { view: "completed" } });
      setCompleted(data.orders);
    } catch {
      // keep showing the last list
    }
  }, []);

  // Refresh the board every 5 seconds, and straight away when the tab is focused again
  useEffect(() => {
    loadActive();
    const timer = setInterval(loadActive, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && loadActive();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadActive]);

  useEffect(() => {
    if (tab === "completed") loadCompleted();
  }, [tab, loadCompleted]);

  // Keep the "x min ago" labels up to date
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Hide the info message after a few seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const advance = async (order) => {
    setBusyId(order.id);
    try {
      // Send the status we SAW – the server refuses if someone else already moved it
      await api.patch(`/staff/orders/${order.id}/status`, { from: order.status });
      if (order.status === "READY") setMessage(`${order.orderNumber} collected ✓`);
    } catch (err) {
      if (err.response?.status === 409) {
        setMessage(err.response.data?.message ?? "This order was already updated.");
      } else if (err.response?.status !== 401) {
        setMessage("Couldn't update the order. Please try again.");
      }
    } finally {
      setBusyId(null);
      loadActive(); // show the real, latest state
    }
  };

  const counts = Object.fromEntries(COLUMNS.map((c) => [c.status, orders.filter((o) => o.status === c.status).length]));

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      {/* Tabs + status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Barista sections" className="flex gap-2 rounded-full bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`rounded-full px-5 py-2 font-semibold transition ${
                tab === t.id ? "bg-espresso text-cream" : "text-espresso/70 hover:bg-latte/20"
              }`}
            >
              {t.label}
              {t.id === "orders" && orders.length > 0 && (
                <span className="ml-2 rounded-full bg-gold px-2 text-sm text-espresso">{orders.length}</span>
              )}
            </button>
          ))}
        </nav>

        <p className={`text-sm ${offline ? "font-semibold text-red-700" : "text-espresso/50"}`}>
          {offline ? "⚠ Connection lost – retrying…" : "● Live – updates every 5 seconds"}
        </p>
      </div>

      {message && (
        <p role="status" className="rounded-xl bg-espresso px-4 py-3 font-medium text-cream">
          {message}
        </p>
      )}

      {/* ---------- Orders board ---------- */}
      {tab === "orders" &&
        (loading ? (
          <p className="py-20 text-center text-espresso/60">Loading orders…</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {COLUMNS.map((column) => (
              <section key={column.status} className={`rounded-3xl border-t-4 bg-latte/15 p-4 ${column.accent}`}>
                <h2 className="mb-4 flex items-center justify-between text-lg font-bold text-coffee">
                  {column.title}
                  <span className="rounded-full bg-white px-3 py-0.5 text-sm text-espresso">{counts[column.status]}</span>
                </h2>
                <div className="space-y-4">
                  {orders
                    .filter((o) => o.status === column.status)
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        now={now}
                        isNew={newIds.has(order.id)}
                        busy={busyId === order.id}
                        onAdvance={advance}
                      />
                    ))}
                  {counts[column.status] === 0 && (
                    <p className="rounded-2xl border-2 border-dashed border-latte/50 py-8 text-center text-espresso/40">
                      {column.empty}
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        ))}

      {/* ---------- Recently completed ---------- */}
      {tab === "completed" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-coffee">Recently completed</h2>
            <button type="button" onClick={loadCompleted} className="text-sm font-semibold text-forest hover:underline">
              Refresh
            </button>
          </div>
          {completed.length === 0 ? (
            <p className="py-8 text-center text-espresso/50">No completed orders yet.</p>
          ) : (
            <ul className="divide-y divide-latte/30">
              {completed.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="font-bold text-espresso">{order.orderNumber}</span>
                  <span className="flex-1 px-4 text-sm text-espresso/70">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </span>
                  <span className="text-sm text-espresso/50">
                    {order.orderType === "TAKEAWAY" ? "Takeaway" : "Dine-In"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- Availability ---------- */}
      {tab === "availability" && <AvailabilityPanel />}
    </main>
  );
}