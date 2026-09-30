// Checks one cart line against the LIVE menu.
// Returns { ok, reason, unitPrice } – unitPrice is the CURRENT price.
export const checkCartLine = (line, productsById) => {
  const product = productsById.get(line.productId);

  if (!product) {
    return { ok: false, reason: "This item is no longer on the menu", unitPrice: line.unitPrice };
  }
  if (!product.isOrderable) {
    return { ok: false, reason: `${product.name} is currently unavailable`, unitPrice: line.unitPrice };
  }

  const allOptions = product.optionGroups.flatMap((group) => group.options);
  let unitPrice = product.basePrice;

  for (const optionId of line.optionIds) {
    const option = allOptions.find((o) => o._id === optionId);
    if (!option) {
      return { ok: false, reason: "One of the chosen options is no longer offered", unitPrice: line.unitPrice };
    }
    if (!option.isAvailable) {
      return { ok: false, reason: `${option.name} is currently unavailable`, unitPrice: line.unitPrice };
    }
    unitPrice += option.priceDelta;
  }

  return { ok: true, reason: "", unitPrice };
};