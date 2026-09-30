import ProductImage from "./ProductImage";
import { formatLKR } from "../../utils/format";

const MAX_QUANTITY = 20;

export default function CartLine({ line, check, category, onQuantityChange, onRemove }) {
  const unitPrice = check?.unitPrice ?? line.unitPrice;
  const problem = check && !check.ok ? check.reason : "";

  return (
    <li className={`flex gap-4 rounded-3xl bg-white p-4 shadow-sm ${problem ? "ring-2 ring-red-300" : ""}`}>
      <ProductImage
        src={line.image}
        alt={line.name}
        category={category}
        className="h-20 w-20 shrink-0 rounded-2xl md:h-24 md:w-24"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-espresso">{line.name}</h3>
            {line.options.length > 0 && (
              <p className="text-sm text-espresso/70">{line.options.map((o) => o.name).join(" · ")}</p>
            )}
            <p className="text-sm text-espresso/60">{formatLKR(unitPrice)} each</p>
          </div>
          <p className="shrink-0 text-lg font-bold text-forest">{formatLKR(unitPrice * line.quantity)}</p>
        </div>

        {problem && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            ⚠ {problem} – please remove this item.
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onQuantityChange(line.key, line.quantity - 1)}
              disabled={line.quantity <= 1}
              aria-label={`Decrease quantity of ${line.name}`}
              className="h-11 w-11 rounded-full border-2 border-latte text-xl font-bold text-coffee disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-bold" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(line.key, line.quantity + 1)}
              disabled={line.quantity >= MAX_QUANTITY}
              aria-label={`Increase quantity of ${line.name}`}
              className="h-11 w-11 rounded-full border-2 border-latte text-xl font-bold text-coffee disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(line.key)}
            aria-label={`Remove ${line.name}`}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}