import mongoose from "mongoose";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";

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
const MAX_LINES = 20;
const MAX_QUANTITY = 20;

// Validates the cart against the database and builds the order snapshot.
// Throws AppError (400 = invalid request, 409 = something became unavailable).
export const buildOrderItems = async (items) => {
  // 1. Basic shape of the cart
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Your cart is empty");
  }
  if (items.length > MAX_LINES) {
    throw new AppError(`An order can have at most ${MAX_LINES} lines`);
  }

  for (const item of items) {
    const validOptionIds =
      Array.isArray(item?.optionIds) && item.optionIds.every((id) => mongoose.isValidObjectId(id));

    if (
      !mongoose.isValidObjectId(item?.productId) ||
      !validOptionIds ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
    ) {
      throw new AppError("Your cart contains an invalid item");
    }
  }

  // 2. Load every product in the cart (with its option groups) in ONE query
  const productIds = [...new Set(items.map((item) => String(item.productId)))];
  const products = await Product.find({ _id: { $in: productIds } })
    .populate("optionGroups")
    .lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));

  // 3. Check each line and build its snapshot
  const orderItems = items.map((item) => {
    const product = productById.get(String(item.productId));

    if (!product) {
      throw new AppError("An item in your cart is no longer on the menu", 409);
    }
    if (!product.isAvailable) {
      throw new AppError(`${product.name} is currently unavailable`, 409);
    }

    const chosenIds = new Set(item.optionIds.map(String));
    const options = [];
    let matchedCount = 0;

    for (const group of product.optionGroups) {
      const chosen = group.options.filter((option) => chosenIds.has(String(option._id)));

      if (chosen.length > 1) {
        throw new AppError(`Please choose only one ${group.name} for ${product.name}`);
      }
      if (chosen.length === 0) {
        if (group.required) {
          throw new AppError(`Please choose a ${group.name} for ${product.name}`);
        }
        continue;
      }

      const [option] = chosen;
      if (!option.isAvailable) {
        throw new AppError(`${option.name} is currently unavailable`, 409);
      }

      options.push({ group: group.name, name: option.name, priceDelta: option.priceDelta });
      matchedCount += 1;
    }

    // Any option id that doesn't belong to this product's groups is rejected
    if (matchedCount !== chosenIds.size) {
      throw new AppError(`Invalid option selected for ${product.name}`);
    }

    const unitPrice = product.basePrice + options.reduce((sum, o) => sum + o.priceDelta, 0);

    return {
      product: product._id,
      name: product.name,
      unitPrice,
      quantity: item.quantity,
      options,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const totalAmount = orderItems.reduce((sum, line) => sum + line.lineTotal, 0);
  return { orderItems, totalAmount };
};