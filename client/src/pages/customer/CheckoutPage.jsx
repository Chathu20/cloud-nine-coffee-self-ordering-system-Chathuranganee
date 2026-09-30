import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../../api/client";
import { useCart } from "../../context/CartContext";
import { useMenu } from "../../context/MenuContext";
import CustomerHeader from "../../components/customer/CustomerHeader";
import ItemCustomizer from "../../components/customer/ItemCustomizer";
import ProductImage from "../../components/customer/ProductImage";
import { checkCartLine } from "../../utils/cartCheck";
import { formatLKR } from "../../utils/format";

// Must match the server's ORDER_TYPES and TIP_PERCENTAGES
const ORDER_TYPE_CHOICES = [
  { value: "DINE_IN", label: "Dine-In", icon: "🍽️", hint: "Enjoy it here" },
  { value: "TAKEAWAY", label: "Takeaway", icon: "🥡", hint: "Take it with you" },
];
const TIP_CHOICES = [0, 5, 10, 15];
const MAX_QUANTITY = 20; // same limit as the server
const TOAST_MS = 3000;

// Same rounding as the server (whole rupees)
const calculateTip = (subtotal, percent) => Math.round((subtotal * percent) / 100);

export default function CheckoutPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const { categories, refresh } = useMenu();

  const [orderType, setOrderType] = useState("");
  const [tipPercent, setTipPercent] = useState(0);
  const [editingKey, setEditingKey] = useState(null); // cart line open in the customise panel
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false); // blocks a fast double tap before React re-renders

  // If the customer presses the browser's Back button on Stripe, the browser may
  // restore this page from memory with the button still stuck on "Opening…".
  useEffect(() => {
    const unlock = (event) => {
      if (event.persisted) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    };
    window.addEventListener("pageshow", unlock);
    return () => window.removeEventListener("pageshow", unlock);
  }, []);

  // "Cappuccino updated" message clears itself
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const productsById = useMemo(
    () => new Map(categories.flatMap((c) => c.products).map((p) => [p._id, p])),
    [categories]
  );
  const menuReady = categories.length > 0;

  // Re-check every line against the live menu (it refreshes every 5 seconds)
  const lines = useMemo(
    () =>
      items.map((line) => {
        const check = menuReady ? checkCartLine(line, productsById) : null;
        const unitPrice = check?.unitPrice ?? line.unitPrice;
        return { ...line, check, unitPrice, lineTotal: unitPrice * line.quantity };
      }),
    [items, productsById, menuReady]
  );

  const problemCount = lines.filter((line) => line.check && !line.check.ok).length;
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const tipAmount = calculateTip(subtotal, tipPercent);
  const total = subtotal + tipAmount;
  const canPay = menuReady && problemCount === 0 && orderType !== "" && !submitting;

  // The line being customised, and its LIVE product (so sold-out options show correctly)
  const editingLine = lines.find((line) => line.key === editingKey) ?? null;
  const editingProduct = editingLine ? productsById.get(editingLine.productId) : null;

  // Nothing to pay for → back to the menu to choose something
  if (items.length === 0) {
    return <Navigate to="/menu" replace />;
  }

  const handlePay = async () => {
    if (!canPay || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      // Send only ids and quantities – the server works out every price itself
      const { data } = await api.post("/orders", {
        orderType,
        tipPercent,
        items: items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          optionIds: line.optionIds,
        })),
      });

      // Leave the kiosk app and open Stripe's secure payment page.
      // The cart is NOT cleared yet: if the customer cancels, it is still there.
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 409) {
        // Something sold out a moment ago – reload the menu so the problem shows up
        setError(`${message}. Please change or remove it in "Your order".`);
        refresh();
      } else if (status === 400 && message) {
        setError(message);
      } else {
        setError("We couldn't start the payment. Please try again or ask a staff member for help.");
      }

      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20">
        <CustomerHeader />
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8">
        <div>
          <Link to="/menu" className="font-medium text-forest hover:underline">
            ← Back to menu
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-coffee">Checkout</h1>
        </div>

        {/* 1. Dine-In or Takeaway */}
        <section className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-espresso">
            1. How would you like your order? <span className="text-red-700">*</span>
          </h2>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Order type">
            {ORDER_TYPE_CHOICES.map((choice) => {
              const selected = orderType === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setOrderType(choice.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-5 transition ${
                    selected
                      ? "border-forest bg-forest text-white"
                      : "border-latte bg-cream text-espresso hover:border-forest"
                  }`}
                >
                  <span className="text-4xl" aria-hidden="true">
                    {choice.icon}
                  </span>
                  <span className="text-lg font-semibold">{choice.label}</span>
                  <span className={`text-sm ${selected ? "text-white/80" : "text-espresso/60"}`}>
                    {choice.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Optional tip */}
        <section className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-espresso">2. Add a tip for our baristas?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Tip">
            {TIP_CHOICES.map((percent) => {
              const selected = tipPercent === percent;
              return (
                <button
                  key={percent}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTipPercent(percent)}
                  className={`rounded-2xl border-2 px-3 py-4 transition ${
                    selected
                      ? "border-forest bg-forest text-white"
                      : "border-latte bg-cream text-espresso hover:border-forest"
                  }`}
                >
                  <span className="block text-lg font-semibold">{percent === 0 ? "No tip" : `${percent}%`}</span>
                  {percent > 0 && (
                    <span className={`block text-sm ${selected ? "text-white/80" : "text-espresso/60"}`}>
                      {formatLKR(calculateTip(subtotal, percent))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Your order – change quantity, customise or remove each item */}
        <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-espresso">3. Your order</h2>
            <Link to="/menu" className="text-sm font-semibold text-forest hover:underline">
              + Add more items
            </Link>
          </div>

          {toast && (
            <p role="status" className="rounded-xl bg-forest/10 px-4 py-2 text-sm font-medium text-forest">
              ✓ {toast}
            </p>
          )}

          <ul className="divide-y divide-latte/40">
            {lines.map((line) => {
              const product = productsById.get(line.productId);
              const problem = line.check && !line.check.ok ? line.check.reason : "";
              const isEditing = line.key === editingKey;
              return (
                <li key={line.key} className="py-4">
                  <div className="flex gap-4">
                    <ProductImage
                      src={line.image}
                      alt={line.name}
                      category={product?.category}
                      className="h-16 w-16 shrink-0 rounded-2xl text-3xl"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-espresso">{line.name}</p>
                          {line.options.length > 0 && (
                            <p className="text-sm text-espresso/60">{line.options.map((o) => o.name).join(" · ")}</p>
                          )}
                          <p className="text-sm text-espresso/50">{formatLKR(line.unitPrice)} each</p>
                        </div>
                        <p className="shrink-0 font-semibold text-espresso">{formatLKR(line.lineTotal)}</p>
                      </div>

                      {problem && (
                        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                          ⚠ {problem} – please change or remove it.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Quantity */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.key, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            aria-label={`Decrease quantity of ${line.name}`}
                            className="h-10 w-10 rounded-full border-2 border-latte text-xl font-bold text-coffee disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-lg font-bold" aria-live="polite">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.key, line.quantity + 1)}
                            disabled={line.quantity >= MAX_QUANTITY}
                            aria-label={`Increase quantity of ${line.name}`}
                            className="h-10 w-10 rounded-full border-2 border-latte text-xl font-bold text-coffee disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex gap-2">
                          {/* Customise: only if the product is still on the menu and can be ordered */}
                          {product?.isOrderable && (
                            <button
                              type="button"
                              onClick={() => setEditingKey(isEditing ? null : line.key)}
                              aria-expanded={isEditing}
                              className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${
                                isEditing
                                  ? "border-gold bg-gold/20 text-coffee"
                                  : "border-latte text-coffee hover:bg-latte/20"
                              }`}
                            >
                              {isEditing ? "Close" : "Customise"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) setEditingKey(null);
                              removeItem(line.key);
                            }}
                            aria-label={`Remove ${line.name}`}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customise panel opens right under the item (a bottom sheet on small screens) */}
                  {isEditing && editingProduct && (
                    <div className="mt-4">
                      <ItemCustomizer
                        key={line.key}
                        product={editingProduct}
                        editLine={editingLine}
                        onClose={() => setEditingKey(null)}
                        onAdded={setToast}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* 4. Order summary */}
        <section className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-espresso">4. Order summary</h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-espresso/80">
              <dt>
                Items ({lines.reduce((sum, line) => sum + line.quantity, 0)})
              </dt>
              <dd>{formatLKR(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-espresso/80">
              <dt>Tip{tipPercent > 0 ? ` (${tipPercent}%)` : ""}</dt>
              <dd>{formatLKR(tipAmount)}</dd>
            </div>
            <div className="flex justify-between text-espresso/80">
              <dt>Order type</dt>
              <dd>{ORDER_TYPE_CHOICES.find((c) => c.value === orderType)?.label ?? "Not chosen yet"}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-latte/60 pt-3">
              <dt className="text-lg font-semibold text-espresso">Total</dt>
              <dd className="text-3xl font-bold text-forest">{formatLKR(total)}</dd>
            </div>
          </dl>
        </section>

        {/* Messages */}
        {problemCount > 0 && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-red-800">
            {problemCount === 1 ? "1 item is" : `${problemCount} items are`} no longer available. Please change or
            remove {problemCount === 1 ? "it" : "them"} in “Your order”.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-red-800">
            {error}
          </p>
        )}
        {!menuReady && <p className="text-sm text-espresso/60">Checking availability…</p>}

        {/* Pay */}
        <div className="space-y-2 pb-6">
          <button
            type="button"
            onClick={handlePay}
            disabled={!canPay}
            className="w-full rounded-2xl bg-forest px-6 py-5 text-xl font-semibold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Opening secure payment…" : `Pay ${formatLKR(total)}`}
          </button>
          {orderType === "" && (
            <p className="text-center text-sm text-espresso/60">Choose Dine-In or Takeaway to continue.</p>
          )}
          <p className="text-center text-sm text-espresso/60">
            🔒 You'll pay on Stripe's secure page (test mode – no real money is taken).
          </p>
        </div>
      </main>
    </div>
  );
}