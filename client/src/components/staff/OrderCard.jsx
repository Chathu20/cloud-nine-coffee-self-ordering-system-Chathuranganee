// One order on the barista board
const ACTION = {
  NEW: { label: "Start preparing", className: "bg-coffee text-white hover:bg-espresso" },
  PREPARING: { label: "Mark ready", className: "bg-forest text-white hover:bg-forest-dark" },
  READY: { label: "Collected ✓", className: "bg-gold text-espresso hover:bg-gold-light" },
};

const ORDER_TYPE = {
  DINE_IN: { label: "Dine-In", className: "bg-latte/30 text-coffee" },
  TAKEAWAY: { label: "Takeaway", className: "bg-forest/10 text-forest" },
};

const LATE_AFTER_MIN = 10; // highlight orders that have waited this long

const minutesSince = (date, now) => Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));

export default function OrderCard({ order, now, isNew, busy, onAdvance }) {
  const waited = minutesSince(order.orderedAt, now);
  const late = order.status !== "READY" && waited >= LATE_AFTER_MIN;
  const action = ACTION[order.status];
  const type = ORDER_TYPE[order.orderType];

  return (
    <article
      className={`rounded-2xl bg-white p-4 shadow-sm transition ${
        isNew ? "ring-4 ring-gold animate-pulse" : late ? "ring-2 ring-red-300" : "ring-1 ring-latte/40"
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-2xl font-bold tracking-wide text-espresso">{order.orderNumber}</h3>
          <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${type?.className}`}>
            {type?.label ?? order.orderType}
          </span>
        </div>
        <p className={`text-right text-sm ${late ? "font-semibold text-red-700" : "text-espresso/60"}`}>
          {waited === 0 ? "Just now" : `${waited} min ago`}
          {late && <span className="block text-xs">Waiting long</span>}
        </p>
      </header>

      <ul className="mt-3 space-y-2 border-t border-latte/40 pt-3">
        {order.items.map((item, index) => (
          <li key={index}>
            <p className="font-semibold text-espresso">
              <span className="mr-1 inline-block min-w-7 rounded-md bg-espresso px-1.5 text-center text-cream">
                {item.quantity}
              </span>
              {item.name}
            </p>
            {item.options.length > 0 && (
              <p className="ml-9 text-sm text-espresso/70">{item.options.map((o) => o.name).join(" · ")}</p>
            )}
          </li>
        ))}
      </ul>

      {action && (
        <button
          type="button"
          onClick={() => onAdvance(order)}
          disabled={busy}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-lg font-semibold transition disabled:cursor-wait disabled:opacity-50 ${action.className}`}
        >
          {busy ? "Updating…" : action.label}
        </button>
      )}
    </article>
  );
}