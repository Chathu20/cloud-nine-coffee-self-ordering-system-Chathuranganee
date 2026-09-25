// A product can be ordered only if:
//  1. the product itself is available, AND
//  2. every REQUIRED option group still has at least one available option
export const isProductOrderable = (product) =>
  product.isAvailable &&
  product.optionGroups.every(
    (group) => !group.required || group.options.some((option) => option.isAvailable)
  );

// Which option should be pre-selected for a group:
//  - the default option, if it is available
//  - otherwise, for required groups, the first available option
//  - optional groups start with nothing selected
export const getDefaultOptionId = (group) => {
  const available = group.options.filter((option) => option.isAvailable);
  const preferred = available.find((option) => option.isDefault);
  if (preferred) return preferred._id;
  if (group.required && available.length > 0) return available[0]._id;
  return null;
};