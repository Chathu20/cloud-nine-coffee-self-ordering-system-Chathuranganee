import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMenu } from "../../context/MenuContext";
import { useCart } from "../../context/CartContext";
import CustomerHeader from "../../components/customer/CustomerHeader";
import CategoryTabs from "../../components/customer/CategoryTabs";
import ProductCard from "../../components/customer/ProductCard";
import ItemCustomizer from "../../components/customer/ItemCustomizer";
import { formatLKR } from "../../utils/format";

const TOAST_MS = 2500;

export default function MenuPage() {
  const { categories, loading, error, refresh } = useMenu();
  const { itemCount, subtotal } = useCart();
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");

  // Default to the first category until the customer picks one
  const current = categories.find((c) => c.name === activeCategory) ?? categories[0];

  // Always read the selected product from the LATEST menu data,
  // so availability changes (every 5 s) are reflected immediately
  const selectedProduct =
    categories.flatMap((c) => c.products).find((p) => p._id === selectedId) ?? null;

  const closeCustomizer = useCallback(() => setSelectedId(null), []);

  // Hide the "added" message after a moment
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-20">
        <CustomerHeader />
        {categories.length > 0 && (
          <CategoryTabs categories={categories} active={current?.name} onChange={setActiveCategory} />
        )}
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        {loading && categories.length === 0 && (
          <p className="py-20 text-center text-lg text-espresso/70">Loading menu…</p>
        )}

        {error && categories.length === 0 && (
          <div className="space-y-4 py-20 text-center">
            <p className="text-lg text-red-700">We couldn't load the menu.</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-2xl bg-forest px-6 py-3 font-semibold text-white hover:bg-forest-dark"
            >
              Try again
            </button>
          </div>
        )}

        {current && (
          <>
            <h2 className="mb-4 text-2xl font-bold text-coffee">{current.name}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {current.products.map((product) => (
                <ProductCard key={product._id} product={product} onSelect={(p) => setSelectedId(p._id)} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Bottom bar – appears once the cart has items */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-latte/40 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-6xl">
            <Link
              to="/cart"
              className="flex w-full items-center justify-between rounded-2xl bg-forest px-6 py-4 text-lg font-semibold text-white transition hover:bg-forest-dark"
            >
              <span>Review order ({itemCount})</span>
              <span>{formatLKR(subtotal)} →</span>
            </Link>
          </div>
        </div>
      )}

      {/* Customization panel */}
      {selectedProduct && (
        <ItemCustomizer
          key={selectedProduct._id}
          product={selectedProduct}
          onClose={closeCustomizer}
          onAdded={setToast}
        />
      )}

      {/* "Added to your order" message */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-espresso px-6 py-3 font-medium text-cream shadow-lg"
        >
          ✓ {toast}
        </div>
      )}
    </div>
  );
}