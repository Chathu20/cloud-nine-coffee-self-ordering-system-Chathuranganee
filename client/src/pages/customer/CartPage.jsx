import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useMenu } from "../../context/MenuContext";
import CustomerHeader from "../../components/customer/CustomerHeader";
import CartLine from "../../components/customer/CartLine";
import { checkCartLine } from "../../utils/cartCheck";
import { formatLKR } from "../../utils/format";

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const { categories } = useMenu();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentCancelled = searchParams.get("payment") === "cancelled";

  const productsById = useMemo(
    () => new Map(categories.flatMap((c) => c.products).map((p) => [p._id, p])),
    [categories]
  );
  const menuReady = categories.length > 0;

  // Check every line against the live menu (null while the menu is still loading)
  const checks = useMemo(
    () => new Map(items.map((line) => [line.key, menuReady ? checkCartLine(line, productsById) : null])),
    [items, productsById, menuReady]
  );

  const problemCount = [...checks.values()].filter((check) => check && !check.ok).length;
  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = items.reduce(
    (sum, line) => sum + (checks.get(line.key)?.unitPrice ?? line.unitPrice) * line.quantity,
    0
  );
  const canContinue = items.length > 0 && menuReady && problemCount === 0;

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
          <h1 className="mt-2 text-3xl font-bold text-coffee">Your Order</h1>
        </div>

        {paymentCancelled && items.length > 0 && (
          <p role="status" className="rounded-2xl bg-latte/30 p-4 font-medium text-coffee">
            Payment was cancelled – don't worry, your order is still here. You can try again whenever you're ready.
          </p>
        )}

        {items.length === 0 ? (
          <div className="space-y-4 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-5xl" aria-hidden="true">☕</p>
            <p className="text-xl font-semibold text-espresso">Your cart is empty</p>
            <p className="text-espresso/70">Pick something delicious from the menu.</p>
            <Link
              to="/menu"
              className="inline-block rounded-2xl bg-forest px-8 py-4 text-lg font-semibold text-white hover:bg-forest-dark"
            >
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {items.map((line) => (
                <CartLine
                  key={line.key}
                  line={line}
                  check={checks.get(line.key)}
                  category={productsById.get(line.productId)?.category}
                  onQuantityChange={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </ul>

            <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-lg">
                <span>
                  Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})
                </span>
                <span className="text-2xl font-bold text-forest">{formatLKR(subtotal)}</span>
              </div>
              <p className="text-sm text-espresso/60">
                You'll choose dine-in or takeaway and an optional tip on the next step.
              </p>

              {problemCount > 0 && (
                <p className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">
                  {problemCount === 1 ? "1 item is" : `${problemCount} items are`} no longer available. Please remove{" "}
                  {problemCount === 1 ? "it" : "them"} to continue.
                </p>
              )}
              {!menuReady && <p className="text-sm text-espresso/60">Checking availability…</p>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/menu"
                  className="flex-1 rounded-2xl border-2 border-forest px-6 py-4 text-center text-lg font-semibold text-forest hover:bg-forest/5"
                >
                  Add more items
                </Link>
                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  disabled={!canContinue}
                  className="flex-1 rounded-2xl bg-forest px-6 py-4 text-lg font-semibold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue to checkout
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}