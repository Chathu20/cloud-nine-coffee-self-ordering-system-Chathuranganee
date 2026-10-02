import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/client";
import useServerEvents from "../../hooks/useServerEvents";

// Live: the server tells this page the moment the barista moves the order on.
// If the live connection isn't working (e.g. a network holds messages back),
// the page checks every 3 seconds instead – so it never needs a manual refresh.
const SAFETY_REFRESH_MS = 30_000; // while live: just a safety net
const FALLBACK_REFRESH_MS = 3_000; // while live updates aren't getting through

// The four stages the customer sees, in order
const STAGES = [
  { status: "NEW", label: "Order received", icon: "🧾", message: "We've got your order. It will be started soon." },
  { status: "PREPARING", label: "Being prepared", icon: "☕", message: "Our barista is making your order right now." },
  { status: "READY", label: "Ready to collect", icon: "🔔", message: "Your order is ready! Please collect it at the counter." },
  { status: "COMPLETED", label: "Collected", icon: "✅", message: "Enjoy! Thank you for visiting Cloud Nine." },
];

const ORDER_TYPE_LABEL = { DINE_IN: "Dine-In", TAKEAWAY: "Takeaway" };

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-LK", { hour: "numeric", minute: "2-digit" });

export default function TrackOrderPage() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [fatalError, setFatalError] = useState(""); // bad or unknown link → stop trying
  const [offline, setOffline] = useState(false); // temporary network problem → keep trying

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/track/${encodeURIComponent(token)}`);
      setOrder(data.order);
      setOffline(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 || status === 404) {
        setFatalError("We couldn't find this order. Please check the QR code and try again.");
      } else {
        setOffline(true); // keep showing the last status we had
      }
    }
  }, [token]);

  const finished = order?.status === "COMPLETED";
  const watching = !fatalError && !finished; // stop once the order is collected or the link is bad

  // Live updates for THIS order only
  const live = useServerEvents(`/api/orders/track/${encodeURIComponent(token)}/events`, "order-updated", load, watching);

  // Load now, keep checking (slowly while live, quickly if not), and straight away
  // when the customer comes back to the tab
  useEffect(() => {
    if (!watching) return;

    load();
    const timer = setInterval(load, live ? SAFETY_REFRESH_MS : FALLBACK_REFRESH_MS);
    // Phones pause background tabs – refresh straight away when the customer comes back
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, watching, live]);

  if (fatalError) {
    return (
      <Shell>
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-5xl" aria-hidden="true">🤔</p>
          <h1 role="alert" className="mt-3 text-xl font-bold text-coffee">
            {fatalError}
          </h1>
        </div>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell>
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="animate-pulse text-5xl" aria-hidden="true">☕</p>
          <p role="status" className="mt-3 text-lg font-semibold text-coffee">
            {offline ? "Can't reach the coffee bar – retrying…" : "Loading your order…"}
          </p>
        </div>
      </Shell>
    );
  }

  const currentIndex = STAGES.findIndex((stage) => stage.status === order.status);
  const current = STAGES[currentIndex] ?? STAGES[0];
  const reachedAt = new Map(order.timeline.map((entry) => [entry.status, entry.at]));
  const isReady = order.status === "READY";

  return (
    <Shell>
      {/* Order number + current status */}
      <section
        className={`rounded-3xl p-6 text-center text-white shadow ${isReady ? "bg-forest ring-4 ring-latte" : "bg-coffee"}`}
      >
        <p className="text-sm uppercase tracking-widest text-white/70">Order number</p>
        <p className="text-5xl font-bold tracking-wide">{order.orderNumber}</p>
        <p className="mt-1 text-white/80">{ORDER_TYPE_LABEL[order.orderType]}</p>

        <p className={`mt-5 text-5xl ${isReady ? "animate-bounce" : ""}`} aria-hidden="true">
          {current.icon}
        </p>
        {/* aria-live: screen readers announce the change when the status moves on */}
        <div aria-live="polite">
          <p className="mt-2 text-2xl font-bold">{current.label}</p>
          <p className="mt-1 text-white/85">{current.message}</p>
        </div>
      </section>

      {/* Progress steps */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="sr-only">Progress</h2>
        <ol className="space-y-4">
          {STAGES.map((stage, index) => {
            const done = index <= currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <li key={stage.status} className="flex items-center gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                    done ? "bg-forest text-white" : "bg-latte/30 text-espresso/40"
                  } ${isCurrent ? "ring-4 ring-forest/25" : ""}`}
                  aria-hidden="true"
                >
                  {done ? "✓" : index + 1}
                </span>
                <div className="flex flex-1 items-center justify-between gap-3">
                  <p className={done ? "font-semibold text-espresso" : "text-espresso/50"}>
                    {stage.label}
                    <span className="sr-only">{done ? " – done" : " – not yet"}</span>
                  </p>
                  {reachedAt.has(stage.status) && (
                    <p className="text-sm text-espresso/60">{formatTime(reachedAt.get(stage.status))}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Items (no prices – this page can be opened by anyone with the link) */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-espresso">Your order</h2>
        <ul className="mt-2 divide-y divide-latte/40">
          {order.items.map((item, index) => (
            <li key={index} className="py-2">
              <p className="font-medium text-espresso">
                {item.quantity} × {item.name}
              </p>
              {item.options.length > 0 && (
                <p className="text-sm text-espresso/60">{item.options.map((o) => o.name).join(" · ")}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-sm text-espresso/60">
        {finished
          ? "This order is complete."
          : offline
            ? "⚠ Connection lost – showing the last update. Reconnecting…"
            : live
              ? "● Live – this page updates the moment your order moves on."
              : "This page updates automatically every few seconds."}
      </p>
    </Shell>
  );
}

// Phone-sized page frame with the shop name on top
function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="bg-coffee px-4 py-4 text-center text-cream shadow">
        <p className="text-lg font-bold">Cloud Nine Coffee Bar</p>
        <p className="text-sm text-cream/70">Order tracking</p>
      </header>
      <main className="mx-auto max-w-md space-y-5 px-4 py-6">{children}</main>
    </div>
  );
}