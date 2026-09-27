import ProductImage from "./ProductImage";
import { formatLKR } from "../../utils/format";

export default function ProductCard({ product, onSelect }) {
  const available = product.isOrderable;
  const hasOptions = product.optionGroups.length > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      disabled={!available}
      aria-label={
        available
          ? `${product.name}, ${hasOptions ? "from " : ""}${formatLKR(product.basePrice)}`
          : `${product.name}, currently unavailable`
      }
      className="flex flex-col overflow-hidden rounded-3xl bg-white text-left shadow-sm transition enabled:hover:-translate-y-1 enabled:hover:shadow-lg enabled:active:scale-[0.98] disabled:cursor-not-allowed"
    >
      <div className="relative">
        <ProductImage
          src={product.image}
          alt={product.name}
          category={product.category}
          className={`aspect-square w-full ${available ? "" : "opacity-50 grayscale"}`}
        />
        {!available && (
          <span className="absolute inset-x-3 top-3 rounded-full bg-espresso/90 px-3 py-1.5 text-center text-sm font-semibold text-white">
            Currently Unavailable
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className={`text-lg font-semibold ${available ? "text-espresso" : "text-espresso/50"}`}>
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-espresso/60">{product.description}</p>
        <p className={`mt-auto pt-2 text-lg font-bold ${available ? "text-forest" : "text-espresso/40"}`}>
          {hasOptions && "From "}
          {formatLKR(product.basePrice)}
        </p>
      </div>
    </button>
  );
}