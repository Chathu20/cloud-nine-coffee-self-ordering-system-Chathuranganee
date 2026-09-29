import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import ProductImage from "../../components/customer/ProductImage";
import ProductFormDialog from "../../components/staff/ProductFormDialog";
import { formatLKR } from "../../utils/format";

const CATEGORY_ORDER = ["Hot Coffee", "Iced Coffee", "Other Drinks", "Food"];
const CONFIRM_MS = 4000; // "Tap again to remove" stays this long

export default function AdminMenuPage() {
  const [products, setProducts] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new item, object = editing
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([api.get("/admin/products"), api.get("/admin/option-groups")]);
      setProducts(p.data.products);
      setOptionGroups(g.data.optionGroups);
      setError("");
    } catch (err) {
      if (err.response?.status !== 401) setError("Couldn't load the menu. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Messages and the "tap again" state clear themselves
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (!confirmRemoveId) return;
    const t = setTimeout(() => setConfirmRemoveId(null), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [confirmRemoveId]);

  // Put the saved product into the list (replace it, or add it at the end)
  const upsert = (saved) =>
    setProducts((list) => (list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved]));

  const handleSaved = (saved, verb) => {
    upsert(saved);
    setEditing(undefined);
    setMessage(`"${saved.name}" ${verb} ✓ – the kiosk shows it within 5 seconds.`);
  };

  const remove = async (product) => {
    // Two taps: the first one asks "are you sure?"
    if (confirmRemoveId !== product.id) {
      setConfirmRemoveId(product.id);
      return;
    }
    setConfirmRemoveId(null);
    setBusyId(product.id);
    try {
      const { data } = await api.delete(`/admin/products/${product.id}`);
      upsert(data.product);
      setMessage(`"${product.name}" removed from the menu. You can restore it below.`);
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't remove the item. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (product) => {
    setBusyId(product.id);
    try {
      const { data } = await api.patch(`/admin/products/${product.id}/restore`);
      upsert(data.product);
      setMessage(`"${product.name}" is back on the menu ✓`);
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't restore the item. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const onMenu = products.filter((p) => !p.isArchived);
  const removed = products.filter((p) => p.isArchived);
  const groupName = (id) => optionGroups.find((g) => g.id === id)?.name;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin" className="text-sm font-medium text-forest hover:underline">
            ← Dashboard
          </Link>
          <h1 className="font-display text-3xl uppercase tracking-wide text-coffee">Menu management</h1>
          <p className="text-sm text-espresso/60">
            {onMenu.length} items on the menu{removed.length > 0 && ` · ${removed.length} removed`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          disabled={loading}
          className="rounded-full bg-forest px-6 py-3 font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
        >
          + Add item
        </button>
      </div>

      {message && (
        <p role="status" className="rounded-xl bg-espresso px-4 py-3 font-medium text-cream">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-20 text-center text-espresso/60">Loading menu…</p>
      ) : (
        <>
          {/* Items on the menu, grouped by category */}
          {CATEGORY_ORDER.map((category) => {
            const items = onMenu.filter((p) => p.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-latte/30">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-espresso/50">{category}</h2>
                <ul className="divide-y divide-latte/30">
                  {items.map((product) => (
                    <li key={product.id} className="flex flex-wrap items-center gap-4 py-3">
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        category={product.category}
                        className="h-14 w-14 shrink-0 rounded-xl text-3xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-espresso">
                          {product.name}
                          {!product.isAvailable && (
                            <span className="ml-2 rounded-full bg-espresso/10 px-2 py-0.5 text-xs font-semibold text-espresso/70">
                              Sold out today
                            </span>
                          )}
                        </p>
                        <p className="line-clamp-1 text-sm text-espresso/60">{product.description || "No description"}</p>
                        <p className="text-xs text-espresso/50">
                          {product.optionGroupIds.length > 0
                            ? `Options: ${product.optionGroupIds.map(groupName).filter(Boolean).join(", ")}`
                            : "No options"}
                        </p>
                      </div>
                      <p className="w-28 shrink-0 text-right font-semibold text-espresso">{formatLKR(product.basePrice)}</p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(product)}
                          className="rounded-lg border-2 border-latte px-4 py-2 text-sm font-semibold text-coffee hover:bg-latte/20"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(product)}
                          disabled={busyId === product.id}
                          className={`w-36 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                            confirmRemoveId === product.id
                              ? "bg-red-700 text-white hover:bg-red-800"
                              : "border-2 border-red-200 text-red-800 hover:bg-red-50"
                          }`}
                        >
                          {confirmRemoveId === product.id ? "Tap again to remove" : "Remove"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {onMenu.length === 0 && (
            <p className="rounded-3xl border-2 border-dashed border-latte/50 py-10 text-center text-espresso/50">
              The menu is empty. Use “+ Add item” to add the first one.
            </p>
          )}

          {/* Removed items can be brought back */}
          {removed.length > 0 && (
            <section className="rounded-3xl bg-latte/15 p-5">
              <h2 className="mb-1 text-lg font-bold text-coffee">Removed items</h2>
              <p className="mb-3 text-sm text-espresso/60">
                Hidden from customers. Kept so past orders and reports stay correct.
              </p>
              <ul className="divide-y divide-latte/40">
                {removed.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-espresso/70">
                      {product.name} <span className="text-sm text-espresso/50">· {product.category}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => restore(product)}
                      disabled={busyId === product.id}
                      className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
                    >
                      {busyId === product.id ? "Restoring…" : "Restore"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {editing !== undefined && (
        <ProductFormDialog
          product={editing}
          optionGroups={optionGroups}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}