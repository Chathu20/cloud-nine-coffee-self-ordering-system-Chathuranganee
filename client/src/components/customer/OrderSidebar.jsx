import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useMenu } from "../../context/MenuContext";
import { checkCartLine } from "../../utils/cartCheck";
import { formatLKR } from "../../utils/format";

const MAX_QUANTITY = 20;
const CONFIRM_MS = 3000; // "Tap again to cancel" stays for 3 seconds

// "Your Order" panel on the right of the menu (wide screens only)
export default function OrderSidebar() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { categories } = useMenu();
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Cancel needs two taps, so one accidental tap can't wipe the order
  useEffect(() => {
    if (!confirmCancel) return;
    const timer = setTimeout(() => setConfirmCancel(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirmCancel]);

  const productsById = useMemo(
    () => new Map(categories.flatMap((c) => c.products).map((p) => [p._id, p])),
    [categories]
  );
  const menuReady = categories.length > 0;

  // Check every line against the live menu (price + availability)
  const lines = useMemo(
    () =>
      items.map((line) => {
        const check = menuReady ? checkCartLine(line, productsById) : null;
        const unitPrice = check?.unitPrice ?? line.unitPrice;
        return { ...line, check, lineTotal: unitPrice * line.quantity };
      }),
    [items, productsById, menuReady]
  );

  const problemCount = lines.filter((line) => line.check && !line.check.ok).length;
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const canProceed = items.length > 0 && menuReady && problemCount === 0;

  const handleCancel = () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    clearCart();
    navigate("/");
  };

  return (
    <aside
      aria-label="Your order"
      className="hidden w-80 shrink-0 flex-col border-l-2 border-gold/50 bg-forest text-cream lg:flex 2xl:w-96"
    >
      <h2 className="border-b border-gold/40 px-6 pb-4 pt-6 text-center font-display text-2xl uppercase tracking-[0.15em] text-gold-light">
        Your Order
      </h2>

      {/* Order lines (scroll if there are many) */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {items.length === 0 ? (
          <div className="mt-12 text-center text-cream/70">
            <p className="text-4xl" aria-hidden="true">☕</p>
            <p className="mt-3 font-medium">Your order is empty</p>
            <p className="text-sm text-cream/50">Tap a drink or snack to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gold/20">
            {lines.map((line) => {
              const problem = line.check && !line.check.ok ? line.check.reason : "";
              return (
                <li key={line.key} className="py-3">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {line.quantity}× {line.name}
                      </p>
                      {line.options.length > 0 && (
                        <p className="text-xs text-cream/60">({line.options.map((o) => o.name).join(", ")})</p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold text-gold-light">{formatLKR(line.lineTotal)}</p>
                  </div>

                  {problem && (
                    <p role="alert" className="mt-2 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                      ⚠ {problem} – please remove it
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.key, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label={`Remove one ${line.name}`}
                      className="h-8 w-8 rounded-full border border-gold/50 font-bold text-gold-light disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.key, line.quantity + 1)}
                      disabled={line.quantity >= MAX_QUANTITY}
                      aria-label={`Add one more ${line.name}`}
                      className="h-8 w-8 rounded-full border border-gold/50 font-bold text-gold-light disabled:opacity-30"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(line.key)}
                      className="ml-auto px-2 py-1 text-xs text-cream/60 underline hover:text-cream"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Total + actions */}
      <div className="space-y-3 bg-espresso px-6 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-lg">Subtotal</span>
          <span className="text-2xl font-bold text-gold-light">{formatLKR(subtotal)}</span>
        </div>
        {problemCount > 0 ? (
          <p className="text-sm text-red-200">Remove unavailable items to continue.</p>
        ) : (
          <p className="text-xs text-cream/50">Dine-in / takeaway and an optional tip are chosen on the next screen.</p>
        )}

        <button
          type="button"
          onClick={handleCancel}
          disabled={items.length === 0}
          className={`w-full rounded-xl border-2 px-4 py-3 font-display text-lg uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-30 ${
            confirmCancel ? "border-red-300 bg-red-900/40 text-red-100" : "border-gold/70 text-gold-light hover:bg-gold/10"
          }`}
        >
          {confirmCancel ? "Tap again to cancel" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/checkout")}
          disabled={!canProceed}
          className="w-full rounded-xl bg-forest px-4 py-4 font-display text-lg uppercase leading-tight tracking-wider text-cream ring-1 ring-gold/60 transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-30"
        >
          Proceed to payment
        </button>
      </div>
    </aside>
  );
}