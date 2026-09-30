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

// Small takeaway-cup icon; the Size group shows bigger cups for bigger sizes
function CupIcon({ height }) {
  return (
    <svg viewBox="0 0 24 32" height={height} width={(height * 24) / 32} aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="4.5" rx="1.5" fill="currentColor" />
      <path d="M4.5 9h15l-2 19.5a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z" fill="currentColor" />
      <path d="M5.8 15h12.4l-.6 6H6.4z" fill="#c9a45c" />
    </svg>
  );
}

const priceText = (option) =>
  !option.isAvailable ? "Sold out" : option.priceDelta > 0 ? `+${formatLKR(option.priceDelta)}` : "";

// Choices of an existing cart line, per option group (null = nothing chosen in that group)
const selectionsFromLine = (product, line) =>
  Object.fromEntries(
    product.optionGroups.map((group) => [
      group._id,
      group.options.find((option) => line.optionIds.includes(option._id))?._id ?? null,
    ])
  );

// editLine (optional): a cart line to change instead of adding a new item
export default function ItemCustomizer({ product, onClose, onAdded, editLine = null }) {
  const { addItem, replaceItem } = useCart();
  const [selections, setSelections] = useState(() => (editLine ? selectionsFromLine(product, editLine) : {}));
  const [quantity, setQuantity] = useState(editLine?.quantity ?? 1);

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
    const item = {
      productId: product._id,
      name: product.name,
      image: product.image,
      unitPrice,
      quantity,
      options: chosen
        .filter(({ option }) => option)
        .map(({ group, option }) => ({ group: group.name, name: option.name, optionId: option._id })),
    };

    if (editLine) {
      replaceItem(editLine.key, item);
      onAdded(`${product.name} updated`);
    } else {
      addItem(item);
      onAdded(`${quantity} × ${product.name} added to your order`);
    }
    onClose();
  };

  return (
    <>
      {/* Dimmed background – small screens only (on wide screens the panel sits under the menu) */}
      <div className="fixed inset-0 z-30 bg-espresso/50 lg:hidden" onClick={onClose} aria-hidden="true" />

      <section
        role="dialog"
        aria-labelledby="customizer-title"
        className="fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t-2 border-gold/60 bg-cream shadow-2xl lg:relative lg:inset-auto lg:z-10 lg:mx-6 lg:mb-6 lg:max-h-[50vh] lg:shrink-0 lg:rounded-3xl lg:border-2 lg:shadow-lg"
      >
        {/* Title row */}
        <div className="flex items-center gap-4 border-b border-latte/40 px-5 py-3">
          <ProductImage
            src={product.image}
            alt=""
            category={product.category}
            className="h-12 w-12 shrink-0 rounded-xl object-cover text-3xl"
          />
          <div className="min-w-0 flex-1">
            <h2 id="customizer-title" className="font-display text-2xl uppercase tracking-wide text-coffee">
              {product.name}
            </h2>
            <p className="line-clamp-1 text-sm text-espresso/70">{product.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-latte text-2xl text-espresso hover:bg-latte/20"
          >
            ×
          </button>
        </div>

        {!product.isOrderable && (
          <p role="alert" className="mx-5 mt-4 rounded-2xl bg-red-50 p-4 font-medium text-red-800">
            Sorry, {product.name} has just become unavailable.
          </p>
        )}

        <div className="flex flex-col gap-4 p-4 xl:flex-row">
          {/* Option groups – one column each, like the kiosk design */}
          {chosen.length > 0 ? (
            <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3">
              {chosen.map(({ group, option: selected }) => {
                const isSize = group.name.toLowerCase() === "size";
                return (
                  <div
                    key={group._id}
                    role="group"
                    aria-labelledby={`group-${group._id}`}
                    className="rounded-2xl bg-white/80 p-3 ring-1 ring-latte/40"
                  >
                    <p id={`group-${group._id}`} className="text-center font-display text-lg uppercase tracking-wider text-espresso">
                      {group.name}
                    </p>
                    <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-espresso/50">
                      {group.required ? "Required" : "Optional"}
                    </p>

                    {isSize ? (
                      // Size: cup icons that grow with the size
                      <div className="flex items-end justify-center gap-2">
                        {group.options.map((option, index) => {
                          const isSelected = selected?._id === option._id;
                          return (
                            <button
                              key={option._id}
                              type="button"
                              disabled={!option.isAvailable}
                              aria-pressed={isSelected}
                              onClick={() => choose(group, option)}
                              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition disabled:cursor-not-allowed disabled:opacity-35 ${
                                isSelected ? "bg-gold/25 text-coffee ring-2 ring-gold" : "text-coffee/80 hover:bg-latte/20"
                              }`}
                            >
                              <CupIcon height={30 + index * 10} />
                              <span className={`text-sm font-semibold ${option.isAvailable ? "" : "line-through"}`}>
                                {option.name}
                              </span>
                              <span className="text-xs text-espresso/60">{priceText(option) || " "}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // Other groups: pill buttons (gold = selected)
                      <div className="flex flex-col gap-2">
                        {group.options.map((option) => {
                          const isSelected = selected?._id === option._id;
                          return (
                            <button
                              key={option._id}
                              type="button"
                              disabled={!option.isAvailable}
                              aria-pressed={isSelected}
                              onClick={() => choose(group, option)}
                              className={`flex min-h-11 flex-col items-start justify-center rounded-2xl px-3.5 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-espresso/10 disabled:text-espresso/40 ${
                                isSelected
                                  ? "bg-gold text-espresso ring-2 ring-gold"
                                  : "bg-forest text-white hover:bg-forest-dark"
                              }`}
                            >
                              <span className={option.isAvailable ? "" : "line-through"}>
                                {isSelected && "✓ "}
                                {option.name}
                              </span>
                              {priceText(option) && <span className="text-xs opacity-80">{priceText(option)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex-1 self-center text-espresso/70">No options for this item – just choose how many you'd like.</p>
          )}

          {/* Quantity + add (sticks to the bottom of the sheet on small screens) */}
          <div className="sticky bottom-0 flex flex-col gap-3 rounded-2xl bg-espresso p-4 text-cream xl:static xl:w-56 xl:shrink-0 xl:self-start">
            <p className="text-center text-xs uppercase tracking-widest text-cream/60">Quantity</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="h-11 w-11 rounded-full border border-gold/60 text-2xl font-bold text-gold-light disabled:opacity-30"
              >
                −
              </button>
              <span className="w-8 text-center text-2xl font-bold" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                disabled={quantity >= MAX_QUANTITY}
                aria-label="Increase quantity"
                className="h-11 w-11 rounded-full border border-gold/60 text-2xl font-bold text-gold-light disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="rounded-full bg-gold px-5 py-3.5 font-semibold text-espresso transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {canAdd ? (
                <>
                  {editLine ? "Save changes" : "Add to order"}
                  <span className="block text-sm font-bold">{formatLKR(unitPrice * quantity)}</span>
                </>
              ) : missingRequired
                  ? `Choose a ${missingRequired.group.name}`
                  : "Unavailable"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}