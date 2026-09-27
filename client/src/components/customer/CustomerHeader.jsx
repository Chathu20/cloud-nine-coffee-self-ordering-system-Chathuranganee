import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { formatLKR } from "../../utils/format";

export default function CustomerHeader() {
  const { itemCount, subtotal } = useCart();

  return (
    <header className="bg-coffee text-cream shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div>
          <p className="text-xl font-bold md:text-2xl">Cloud Nine Coffee Bar</p>
          <p className="text-sm text-cream/70">Order here · Pay by card</p>
        </div>

        <Link
          to="/cart"
          aria-label={`View cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          className="flex items-center gap-2 rounded-2xl bg-forest px-5 py-3 font-semibold text-white transition hover:bg-forest-dark"
        >
          <span aria-hidden="true">🛒</span>
          <span>{itemCount}</span>
          <span className="hidden sm:inline">· {formatLKR(subtotal)}</span>
        </Link>
      </div>
    </header>
  );
}