import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";

// A big, easy-to-tap on/off switch
function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-forest" : "bg-espresso/25"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${checked ? "translate-x-7" : "translate-x-1"}`}
      />
    </button>
  );
}

// Lets the barista mark products and options as available / sold out
export default function AvailabilityPanel() {
  const [products, setProducts] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null); // id of the switch being saved

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/availability");
      setProducts(data.products);
      setOptionGroups(data.optionGroups);
      setError("");
    } catch {
      setError("Couldn't load the menu. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Flip the switch straight away (feels instant); undo it if the server says no
  const toggleProduct = async (product) => {
    const next = !product.isAvailable;
    setSaving(product._id);
    setProducts((list) => list.map((p) => (p._id === product._id ? { ...p, isAvailable: next } : p)));
    try {
      await api.patch(`/staff/products/${product._id}/availability`, { isAvailable: next });
      setError("");
    } catch {
      setProducts((list) => list.map((p) => (p._id === product._id ? { ...p, isAvailable: !next } : p)));
      setError(`Couldn't update ${product.name}. Please try again.`);
    } finally {
      setSaving(null);
    }
  };

  const toggleOption = async (group, option) => {
    const next = !option.isAvailable;
    const setOption = (value) =>
      setOptionGroups((list) =>
        list.map((g) =>
          g._id !== group._id
            ? g
            : { ...g, options: g.options.map((o) => (o._id === option._id ? { ...o, isAvailable: value } : o)) }
        )
      );

    setSaving(option._id);
    setOption(next);
    try {
      await api.patch(`/staff/option-groups/${group._id}/options/${option._id}/availability`, { isAvailable: next });
      setError("");
    } catch {
      setOption(!next);
      setError(`Couldn't update ${option.name}. Please try again.`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p className="py-10 text-center text-espresso/60">Loading menu…</p>;

  // Group products by category for easy scanning
  const categories = [...new Set(products.map((p) => p.category))];
  const soldOutCount =
    products.filter((p) => !p.isAvailable).length +
    optionGroups.flatMap((g) => g.options).filter((o) => !o.isAvailable).length;

  return (
    <div className="space-y-6">
      <p className="text-espresso/70">
        Turn items off when they run out – the kiosk shows them as <strong>Sold out</strong> within 5 seconds.
        {soldOutCount > 0 && (
          <span className="ml-2 rounded-full bg-red-100 px-3 py-0.5 text-sm font-semibold text-red-800">
            {soldOutCount} turned off
          </span>
        )}
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Products */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-coffee">Products</h2>
          <div className="space-y-5">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-espresso/50">{category}</h3>
                <ul className="divide-y divide-latte/30">
                  {products
                    .filter((p) => p.category === category)
                    .map((product) => (
                      <li key={product._id} className="flex items-center justify-between gap-4 py-3">
                        <span className={product.isAvailable ? "font-medium text-espresso" : "text-espresso/40 line-through"}>
                          {product.name}
                        </span>
                        <Switch
                          checked={product.isAvailable}
                          onChange={() => toggleProduct(product)}
                          disabled={saving === product._id}
                          label={`${product.name} available`}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Options (milk, flavours, sizes…) */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-coffee">Options</h2>
          <div className="space-y-5">
            {optionGroups.map((group) => (
              <div key={group._id}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-espresso/50">
                  {group.name} {group.required && <span className="normal-case tracking-normal">(required)</span>}
                </h3>
                <ul className="divide-y divide-latte/30">
                  {group.options.map((option) => (
                    <li key={option._id} className="flex items-center justify-between gap-4 py-3">
                      <span className={option.isAvailable ? "font-medium text-espresso" : "text-espresso/40 line-through"}>
                        {option.name}
                      </span>
                      <Switch
                        checked={option.isAvailable}
                        onChange={() => toggleOption(group, option)}
                        disabled={saving === option._id}
                        label={`${option.name} available`}
                      />
                    </li>
                  ))}
                </ul>
                {group.required && group.options.every((o) => !o.isAvailable) && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    ⚠ Every {group.name.toLowerCase()} is off – drinks that need a {group.name.toLowerCase()} can't be
                    ordered.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}