import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMenu } from "../../context/MenuContext";
import { useCart } from "../../context/CartContext";
import CustomerHeader from "../../components/customer/CustomerHeader";
import CategoryTabs from "../../components/customer/CategoryTabs";
import ProductCard from "../../components/customer/ProductCard";
import ItemCustomizer from "../../components/customer/ItemCustomizer";
import OrderSidebar from "../../components/customer/OrderSidebar";
import CoffeeBranch from "../../components/customer/CoffeeBranch";
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
    // Wide screens (kiosk): menu on the left, "Your Order" panel on the right, nothing scrolls but the menu grid.
    // Small screens: one column, with a "Review order" bar at the bottom.
    <div className="lg:flex lg:h-screen lg:overflow-hidden">
      <div className="relative flex min-h-screen flex-1 flex-col lg:min-h-0">
        <div className="sticky top-0 z-20">
          <CustomerHeader hideCartOnWide />
          {categories.length > 0 && (
            <CategoryTabs categories={categories} active={current?.name} onChange={setActiveCategory} />
          )}
        </div>

        {/* Botanical line drawings in the corners (decoration only) */}
        <CoffeeBranch className="absolute left-0 top-36 hidden w-40 text-forest/15 md:block" />
        <CoffeeBranch className="absolute bottom-4 right-2 hidden w-40 rotate-180 text-forest/15 md:block" />

        <main className="relative z-10 flex-1 px-4 py-6 pb-28 md:px-8 lg:overflow-y-auto lg:pb-6">
          <div className="mx-auto max-w-6xl">
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {current.products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    selected={product._id === selectedId}
                    onSelect={(p) => setSelectedId(p._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Customization panel: under the menu on wide screens, a bottom sheet on small screens */}
        {selectedProduct && (
          <ItemCustomizer
            key={selectedProduct._id}
            product={selectedProduct}
            onClose={closeCustomizer}
            onAdded={setToast}
          />
        )}
      </div>

      <OrderSidebar />

      {/* Bottom bar – small screens only, once the cart has items */}
      {itemCount > 0 && !selectedProduct && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/40 bg-espresso/95 p-4 backdrop-blur lg:hidden">
          <Link
            to="/cart"
            className="flex w-full items-center justify-between rounded-full bg-forest px-6 py-4 text-lg font-semibold text-white ring-1 ring-gold/60 transition hover:bg-forest-dark"
          >
            <span>Review order ({itemCount})</span>
            <span>{formatLKR(subtotal)} →</span>
          </Link>
        </div>
      )}

      {/* "Added to your order" message */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full border border-gold/60 bg-espresso px-6 py-3 font-medium text-cream shadow-lg"
        >
          ✓ {toast}
        </div>
      )}
    </div>
  );
}