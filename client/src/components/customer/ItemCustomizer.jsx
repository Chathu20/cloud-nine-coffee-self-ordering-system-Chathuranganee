import { useEffect, useState } from "react";
import ProductImage from "./ProductImage";
import { useCart } from "../../context/CartContext";
import { formatLKR } from "../../utils/format";

const MAX_QUANTITY = 20;

// Works out which option is chosen for a group, using LIVE availability.
// value: undefined = not touched yet (use default), null = "none", string = option id
const resolveOption = (group, value) => {
  const availableOption = (id) => group.options.find((o) => o._id === id && o.isAvailable) ?? null;

  if (value === null) return null;
  if (value !== undefined) {
    const picked = availableOption(value);
    if (picked) return picked;
  }
  return group.defaultOptionId ? availableOption(group.defaultOptionId) : null;
};

export default function ItemCustomizer({ product, onClose, onAdded }) {
  const { addItem } = useCart();
  const [selections, setSelections] = useState({});
  const [quantity, setQuantity] = useState(1);

  // Close with the Escape key
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const chosen = product.optionGroups.map((group) => ({
    group,
    option: resolveOption(group, selections[group._id]),
  }));
  const missingRequired = chosen.find(({ group, option }) => group.required && !option);
  const unitPrice = product.basePrice + chosen.reduce((sum, { option }) => sum + (option?.priceDelta ?? 0), 0);
  const canAdd = product.isOrderable && !missingRequired;

  const choose = (group, option) => {
    setSelections((current) => {
      const alreadySelected = resolveOption(group, current[group._id])?._id === option._id;
      // Optional groups: tapping the selected option again removes it
      const next = alreadySelected && !group.required ? null : option._id;
      return { ...current, [group._id]: next };
    });
  };

  const handleAdd = () => {
    if (!canAdd) return;
    addItem({
      productId: product._id,
      name: product.name,
      image: product.image,
      unitPrice,
      quantity,
      options: chosen
        .filter(({ option }) => option)
        .map(({ group, option }) => ({ group: group.name, name: option.name, optionId: option._id })),
    });
    onAdded(`${quantity} × ${product.name} added to your order`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/50 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl md:rounded-3xl"
      >
        {/* Scrollable content */}
        <div className="overflow-y-auto">
          <div className="relative">
            <ProductImage
              src={product.image}
              alt={product.name}
              category={product.category}
              className="h-56 w-full md:h-64"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-2xl text-espresso shadow"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <h2 id="customizer-title" className="text-2xl font-bold text-coffee md:text-3xl">
                {product.name}
              </h2>
              <p className="mt-1 text-espresso/70">{product.description}</p>
              <p className="mt-2 text-lg font-semibold text-forest">{formatLKR(product.basePrice)}</p>
            </div>

            {!product.isOrderable && (
              <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-red-800">
                Sorry, {product.name} has just become unavailable.
              </p>
            )}

            {chosen.map(({ group, option: selected }) => (
              <fieldset key={group._id} className="space-y-3">
                <legend className="flex w-full items-center justify-between">
                  <span className="text-lg font-semibold text-espresso">{group.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      group.required ? "bg-coffee text-cream" : "bg-latte/30 text-coffee"
                    }`}
                  >
                    {group.required ? "Required" : "Optional"}
                  </span>
                </legend>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group.options.map((option) => {
                    const isSelected = selected?._id === option._id;
                    return (
                      <button
                        key={option._id}
                        type="button"
                        disabled={!option.isAvailable}
                        aria-pressed={isSelected}
                        onClick={() => choose(group, option)}
                        className={`flex min-h-16 flex-col items-start justify-center rounded-2xl border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:border-latte/30 disabled:bg-white/50 disabled:text-espresso/40 ${
                          isSelected ? "border-forest bg-forest/10" : "border-latte/50 bg-white hover:border-forest/50"
                        }`}
                      >
                        <span className={`font-semibold ${option.isAvailable ? "" : "line-through"}`}>
                          {isSelected && "✓ "}
                          {option.name}
                        </span>
                        <span className="text-sm">
                          {!option.isAvailable
                            ? "Unavailable"
                            : option.priceDelta > 0
                              ? `+${formatLKR(option.priceDelta)}`
                              : "No extra charge"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        {/* Fixed footer: quantity + add button */}
        <div className="flex items-center gap-4 border-t border-latte/40 bg-white p-4 md:p-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="h-12 w-12 rounded-full border-2 border-latte text-2xl font-bold text-coffee disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center text-xl font-bold" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              disabled={quantity >= MAX_QUANTITY}
              aria-label="Increase quantity"
              className="h-12 w-12 rounded-full border-2 border-latte text-2xl font-bold text-coffee disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="flex-1 rounded-2xl bg-forest px-6 py-4 text-lg font-semibold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {canAdd
              ? `Add to cart · ${formatLKR(unitPrice * quantity)}`
              : missingRequired
                ? `Choose a ${missingRequired.group.name}`
                : "Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
}