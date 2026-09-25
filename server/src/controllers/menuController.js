import Product from "../models/Product.js";
import { CATEGORIES } from "../constants.js";
import { isProductOrderable, getDefaultOptionId } from "../services/pricing.js";

// GET /api/menu – full menu grouped by category, with availability
export const getMenu = async (req, res) => {
  const products = await Product.find()
    .select("-createdAt -updatedAt -__v")
    .populate({ path: "optionGroups", select: "name required options" })
    .sort({ sortOrder: 1 })
    .lean();

  const menuProducts = products.map((product) => ({
    ...product,
    isOrderable: isProductOrderable(product),
    optionGroups: product.optionGroups.map((group) => ({
      ...group,
      defaultOptionId: getDefaultOptionId(group),
    })),
  }));

  const categories = CATEGORIES.map((name) => ({
    name,
    products: menuProducts.filter((product) => product.category === name),
  })).filter((category) => category.products.length > 0);

  // Always send fresh data – the customer screen polls this for availability changes
  res.set("Cache-Control", "no-store");
  res.json({ categories });
};