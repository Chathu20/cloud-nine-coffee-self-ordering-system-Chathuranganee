import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { formatLKR } from "../../utils/format";

// hideCartOnWide: the menu page shows the order in a side panel on wide screens,
// so the cart button is only needed on smaller screens there.
export default function CustomerHeader({ hideCartOnWide = false }) {
  const { itemCount, subtotal } = useCart();

  return (
    <header className="border-b-2 border-gold/60 bg-espresso text-cream shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-5">
        <div className="min-w-0">
          <p className="font-display text-xl uppercase tracking-[0.12em] text-gold-light md:text-3xl">
            Cloud Nine Coffee Bar
          </p>
          <p className="text-xs text-cream/60 md:text-sm">Order here · Pay by card</p>
        </div>

        <Link
          to="/cart"
          aria-label={`View cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          className={`flex shrink-0 items-center gap-2 rounded-full border border-gold/60 bg-forest px-5 py-3 font-semibold text-white transition hover:bg-forest-dark ${
            hideCartOnWide ? "lg:hidden" : ""
          }`}
        >
          <span aria-hidden="true">🛒</span>
          <span>{itemCount}</span>
          <span className="hidden sm:inline">· {formatLKR(subtotal)}</span>
        </Link>
      </div>
    </header>
  );
}