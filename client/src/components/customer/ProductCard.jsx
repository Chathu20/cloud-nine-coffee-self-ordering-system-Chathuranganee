import ProductImage from "./ProductImage";
import { formatLKR } from "../../utils/format";

export default function ProductCard({ product, selected = false, onSelect }) {
  const available = product.isOrderable;
  const hasOptions = product.optionGroups.length > 0;

  // Text colours change when the card is selected (dark green card)
  const nameColour = selected ? "text-gold-light" : available ? "text-espresso" : "text-espresso/50";
  const priceColour = selected ? "text-gold-light" : available ? "text-espresso" : "text-espresso/40";

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      disabled={!available}
      aria-pressed={selected}
      aria-label={
        available
          ? `${product.name}, ${hasOptions ? "from " : ""}${formatLKR(product.basePrice)}`
          : `${product.name}, currently unavailable`
      }
      className={`group flex flex-col rounded-2xl p-2.5 text-center shadow-md transition enabled:hover:-translate-y-1 enabled:hover:shadow-lg enabled:active:scale-[0.98] disabled:cursor-not-allowed ${
        selected ? "bg-forest ring-2 ring-gold" : "bg-white ring-1 ring-latte/40"
      }`}
    >
      {/* Framed photo */}
      <div className="relative overflow-hidden rounded-xl ring-1 ring-gold/40">
        <ProductImage
          src={product.image}
          alt={product.name}
          category={product.category}
          className={`aspect-[4/3] w-full object-cover ${available ? "" : "opacity-50 grayscale"}`}
        />
        {!available && (
          <span className="absolute inset-x-2 top-2 rounded-full bg-espresso/90 px-3 py-1 text-xs font-semibold text-white">
            Currently Unavailable
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 px-1 pb-1 pt-3">
        <h3 className={`font-display text-lg uppercase leading-tight tracking-wide ${nameColour}`}>{product.name}</h3>
        <p className={`line-clamp-2 text-xs ${selected ? "text-cream/75" : "text-espresso/60"}`}>
          {product.description}
        </p>
        <p className={`mt-auto pt-1 text-lg font-semibold ${priceColour}`}>
          {hasOptions && <span className="text-xs font-normal">From </span>}
          {formatLKR(product.basePrice)}
        </p>

        {/* Looks like a button; the whole card is the real button */}
        <span
          aria-hidden="true"
          className={`mt-2 w-full rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
            selected
              ? "border border-gold text-gold-light"
              : available
                ? "bg-forest text-white group-hover:bg-forest-dark"
                : "bg-espresso/10 text-espresso/40"
          }`}
        >
          {!available ? "Sold out" : hasOptions ? "Customize" : "Select"}
        </span>
      </div>
    </button>
  );
}