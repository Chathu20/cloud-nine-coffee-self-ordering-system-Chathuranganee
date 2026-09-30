import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import ProductImage from "../../components/customer/ProductImage";
import ProductFormDialog from "../../components/staff/ProductFormDialog";
import { formatLKR } from "../../utils/format";

const CATEGORY_ORDER = ["Hot Coffee", "Iced Coffee", "Other Drinks", "Food"];
const ALL = "All";
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
  const [category, setCategory] = useState(ALL); // category filter chip
  const [search, setSearch] = useState(""); // search box text

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

  // Search: case-insensitive, matches any part of the name ("lat" finds "Iced Caramel Latte")
  const query = search.trim().toLowerCase();
  const matchesSearch = (p) => p.name.toLowerCase().includes(query);
  const matchesCategory = (p) => category === ALL || p.category === category;

  const shownOnMenu = onMenu.filter((p) => matchesSearch(p) && matchesCategory(p));
  const shownRemoved = removed.filter((p) => matchesSearch(p) && matchesCategory(p));
  const isFiltering = query !== "" || category !== ALL;

  // Numbers on the chips: how many on-menu items each category has for the current search
  const countFor = (c) => onMenu.filter((p) => matchesSearch(p) && (c === ALL || p.category === c)).length;

  const clearFilters = () => {
    setSearch("");
    setCategory(ALL);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-coffee md:text-3xl">Menu management</h1>
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

      {/* Search + category filters */}
      <div className="space-y-3 rounded-3xl bg-foam p-4 md:p-5">
        <div className="relative">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-coffee/60" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            placeholder="Search menu items by name…"
            aria-label="Search menu items by name"
            className="w-full rounded-full border-2 border-latte/50 bg-white py-3 pl-12 pr-4 text-espresso outline-none placeholder:text-espresso/40 focus:border-forest"
          />
        </div>

        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {[ALL, ...CATEGORY_ORDER].map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-coffee text-white shadow-md" : "bg-white text-coffee ring-1 ring-latte/50 hover:bg-latte/20"
                }`}
              >
                {c}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-latte/25 text-coffee"}`}
                >
                  {countFor(c)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="py-20 text-center text-espresso/60">Loading menu…</p>
      ) : (
        <>
          {isFiltering && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-espresso/60">
              <p role="status">
                Showing {shownOnMenu.length} of {onMenu.length} items
                {category !== ALL && ` in ${category}`}
                {query && ` matching “${search.trim()}”`}
              </p>
              <button type="button" onClick={clearFilters} className="font-semibold text-forest hover:underline">
                Clear filters
              </button>
            </div>
          )}

          {/* Items on the menu, grouped by category */}
          {CATEGORY_ORDER.map((group) => {
            const items = shownOnMenu.filter((p) => p.category === group);
            if (items.length === 0) return null;
            return (
              <section key={group} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-latte/30">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-espresso/50">
                  {group} · {items.length}
                </h2>
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

          {onMenu.length > 0 && shownOnMenu.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-latte/50 py-10 text-center">
              <p className="text-espresso/60">No menu items match your search.</p>
              <button type="button" onClick={clearFilters} className="mt-2 font-semibold text-forest hover:underline">
                Clear filters
              </button>
            </div>
          )}

          {/* Removed items can be brought back (the same search and filter apply) */}
          {shownRemoved.length > 0 && (
            <section className="rounded-3xl bg-latte/15 p-5">
              <h2 className="mb-1 text-lg font-bold text-coffee">Removed items</h2>
              <p className="mb-3 text-sm text-espresso/60">
                Hidden from customers. Kept so past orders and reports stay correct.
              </p>
              <ul className="divide-y divide-latte/40">
                {shownRemoved.map((product) => (
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