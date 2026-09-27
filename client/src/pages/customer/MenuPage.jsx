import { Link } from "react-router-dom";
import { useMenu } from "../../context/MenuContext";
import { useCart } from "../../context/CartContext";

// TEMPORARY test page – replaced by the real menu in the next step
export default function MenuPage() {
  const { categories, loading, error } = useMenu();
  const { itemCount, subtotal, addItem, clearCart } = useCart();

  const products = categories.flatMap((category) => category.products);
  const croissant = products.find((p) => p.name === "Butter Croissant");

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-3xl font-bold text-coffee">Menu (test page)</h1>

      {loading && <p>Loading menu…</p>}
      {error && <p className="text-red-700">{error}</p>}

      <p>
        <strong>{products.length}</strong> products loaded:
      </p>
      <ul className="list-inside list-disc">
        {products.map((p) => (
          <li key={p._id} className={p.isOrderable ? "" : "text-espresso/40 line-through"}>
            {p.name} – LKR {p.basePrice} {!p.isOrderable && "(unavailable)"}
          </li>
        ))}
      </ul>

      <div className="space-y-3 rounded-2xl bg-white p-5 shadow">
        <p>
          Cart: <strong>{itemCount}</strong> item(s) · LKR <strong>{subtotal}</strong>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!croissant?.isOrderable}
            onClick={() =>
              addItem({
                productId: croissant._id,
                name: croissant.name,
                image: croissant.image,
                unitPrice: croissant.basePrice,
                quantity: 1,
                options: [],
              })
            }
            className="rounded-xl bg-forest px-4 py-2 font-semibold text-white disabled:opacity-40"
          >
            Add a croissant
          </button>
          <button type="button" onClick={clearCart} className="rounded-xl border border-latte px-4 py-2">
            Clear cart
          </button>
        </div>
      </div>

      <Link to="/" className="text-forest underline">
        Back to welcome screen
      </Link>
    </main>
  );
}