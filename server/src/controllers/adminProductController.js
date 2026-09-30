import mongoose from "mongoose";
import Product from "../models/Product.js";
import OptionGroup from "../models/OptionGroup.js";
import { CATEGORIES } from "../constants.js";
import AppError from "../utils/AppError.js";

const MAX_NAME = 60;
const MAX_DESCRIPTION = 300;
const MIN_PRICE = 200; // Stripe rejects charges below ~LKR 150 (USD 0.50)
const MAX_PRICE = 100000;
const MAX_IMAGE = 500;

// A local path like /images/latte.jpg, or a full http(s) URL
const IMAGE_PATTERN = /^(\/[\w\-./]+|https?:\/\/\S+)$/i;

const PRODUCT_FIELDS = "name description category basePrice image isAvailable isArchived optionGroups sortOrder";

const toAdminProduct = (product) => ({
  id: product._id,
  name: product.name,
  description: product.description,
  category: product.category,
  basePrice: product.basePrice,
  image: product.image,
  isAvailable: product.isAvailable,
  isArchived: Boolean(product.isArchived),
  optionGroupIds: (product.optionGroups ?? []).map(String),
});

// Picks ONLY the allowed fields from the request and validates each one.
// requireAll = true when creating (name, category and price must be sent).
const readProductFields = (body, { requireAll }) => {
  const fields = {};

  if (body.name !== undefined || requireAll) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > MAX_NAME) {
      throw new AppError(`Name must be 1–${MAX_NAME} characters`);
    }
    fields.name = body.name.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length > MAX_DESCRIPTION) {
      throw new AppError(`Description must be at most ${MAX_DESCRIPTION} characters`);
    }
    fields.description = body.description.trim();
  }

  if (body.category !== undefined || requireAll) {
    if (!CATEGORIES.includes(body.category)) {
      throw new AppError(`Category must be one of: ${CATEGORIES.join(", ")}`);
    }
    fields.category = body.category;
  }

  if (body.basePrice !== undefined || requireAll) {
    if (!Number.isInteger(body.basePrice) || body.basePrice < MIN_PRICE || body.basePrice > MAX_PRICE) {
      throw new AppError(`Price must be a whole number between ${MIN_PRICE} and ${MAX_PRICE}`);
    }
    fields.basePrice = body.basePrice;
  }

  if (body.image !== undefined) {
    const image = typeof body.image === "string" ? body.image.trim() : null;
    if (image === null || image.length > MAX_IMAGE || (image !== "" && !IMAGE_PATTERN.test(image))) {
      throw new AppError("Image must be a path like /images/latte.jpg or a full http(s) URL");
    }
    fields.image = image;
  }

  if (body.optionGroupIds !== undefined) {
    const ids = body.optionGroupIds;
    if (!Array.isArray(ids) || ids.length > 10 || !ids.every((id) => mongoose.isValidObjectId(id))) {
      throw new AppError("optionGroupIds must be a list of option group ids");
    }
    fields.optionGroups = [...new Set(ids.map(String))];
  }

  if (Object.keys(fields).length === 0) {
    throw new AppError("Nothing to update");
  }

  return fields;
};

// Every option group id sent must really exist
const checkOptionGroupsExist = async (ids) => {
  if (!ids || ids.length === 0) return;
  const found = await OptionGroup.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    throw new AppError("One of the chosen option groups doesn't exist");
  }
};

// A clear message when a name is already taken (possibly by a removed product)
const duplicateNameError = async (name) => {
  const existing = await Product.findOne({ name }).select("isArchived").lean();
  return new AppError(
    existing?.isArchived
      ? `"${name}" was removed earlier – restore it from Removed items instead of adding it again`
      : `A product named "${name}" already exists`,
    409
  );
};

const findValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid product id");
  }
  return id;
};

// GET /api/admin/products – everything, including removed products (so they can be restored)
export const listProducts = async (req, res) => {
  const products = await Product.find().select(PRODUCT_FIELDS).sort({ sortOrder: 1, name: 1 }).lean();

  res.set("Cache-Control", "no-store");
  res.json({ products: products.map(toAdminProduct) });
};

// GET /api/admin/option-groups – choices for the "Add / edit product" form
export const listOptionGroups = async (req, res) => {
  const groups = await OptionGroup.find().select("name required options.name").sort({ name: 1 }).lean();

  res.set("Cache-Control", "no-store");
  res.json({
    optionGroups: groups.map((g) => ({
      id: g._id,
      name: g.name,
      required: g.required,
      options: g.options.map((o) => o.name),
    })),
  });
};

// POST /api/admin/products – add a new menu item
export const createProduct = async (req, res) => {
  const fields = readProductFields(req.body ?? {}, { requireAll: true });
  await checkOptionGroupsExist(fields.optionGroups);

  // New items go to the end of the menu
  const last = await Product.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean();

  let product;
  try {
    product = await Product.create({ ...fields, sortOrder: (last?.sortOrder ?? 0) + 1 });
  } catch (error) {
    if (error.code === 11000) throw await duplicateNameError(fields.name);
    throw error;
  }

  res.status(201).json({ product: toAdminProduct(product) });
};

// PATCH /api/admin/products/:id – edit name, description, category, price, image, option groups
export const updateProduct = async (req, res) => {
  const id = findValidId(req.params.id);
  const fields = readProductFields(req.body ?? {}, { requireAll: false });
  await checkOptionGroupsExist(fields.optionGroups);

  let product;
  try {
    product = await Product.findByIdAndUpdate(
      id,
      { $set: fields },
      { returnDocument: "after", runValidators: true }
    )
      .select(PRODUCT_FIELDS)
      .lean();
  } catch (error) {
    if (error.code === 11000) throw await duplicateNameError(fields.name);
    throw error;
  }

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  res.json({ product: toAdminProduct(product) });
};

// DELETE /api/admin/products/:id – remove from the menu.
// It is ARCHIVED, not erased: old orders and reports still refer to it, and it can be restored.
export const removeProduct = async (req, res) => {
  const id = findValidId(req.params.id);

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: { isArchived: true } },
    { returnDocument: "after" }
  )
    .select(PRODUCT_FIELDS)
    .lean();

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  res.json({ product: toAdminProduct(product) });
};

// PATCH /api/admin/products/:id/restore – put a removed product back on the menu
export const restoreProduct = async (req, res) => {
  const id = findValidId(req.params.id);

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: { isArchived: false } },
    { returnDocument: "after" }
  )
    .select(PRODUCT_FIELDS)
    .lean();

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  res.json({ product: toAdminProduct(product) });
};