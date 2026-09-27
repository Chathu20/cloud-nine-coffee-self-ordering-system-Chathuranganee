import mongoose from "mongoose";
import Product from "../models/Product.js";
import AppError from "../utils/AppError.js";

const MAX_NAME = 60;
const MAX_DESCRIPTION = 300;
const MIN_PRICE = 200; // Stripe rejects charges below ~LKR 150 (USD 0.50)
const MAX_PRICE = 100000;
const MAX_IMAGE = 500;

// A local path like /images/latte.jpg, or a full http(s) URL
const IMAGE_PATTERN = /^(\/[\w\-./]+|https?:\/\/\S+)$/i;

const toAdminProduct = (product) => ({
  id: product._id,
  name: product.name,
  description: product.description,
  category: product.category,
  basePrice: product.basePrice,
  image: product.image,
  isAvailable: product.isAvailable,
});

// Picks ONLY the editable fields from the request and validates each one
const readUpdates = (body) => {
  const updates = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > MAX_NAME) {
      throw new AppError(`Name must be 1–${MAX_NAME} characters`);
    }
    updates.name = body.name.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length > MAX_DESCRIPTION) {
      throw new AppError(`Description must be at most ${MAX_DESCRIPTION} characters`);
    }
    updates.description = body.description.trim();
  }

  if (body.basePrice !== undefined) {
    if (!Number.isInteger(body.basePrice) || body.basePrice < MIN_PRICE || body.basePrice > MAX_PRICE) {
      throw new AppError(`Price must be a whole number between ${MIN_PRICE} and ${MAX_PRICE}`);
    }
    updates.basePrice = body.basePrice;
  }

  if (body.image !== undefined) {
    const image = typeof body.image === "string" ? body.image.trim() : null;
    if (image === null || image.length > MAX_IMAGE || (image !== "" && !IMAGE_PATTERN.test(image))) {
      throw new AppError("Image must be a path like /images/latte.jpg or a full http(s) URL");
    }
    updates.image = image;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Nothing to update. Send name, description, basePrice or image");
  }

  return updates;
};

// GET /api/admin/products
export const listProducts = async (req, res) => {
  const products = await Product.find()
    .select("name description category basePrice image isAvailable")
    .sort({ sortOrder: 1 })
    .lean();

  res.set("Cache-Control", "no-store");
  res.json({ products: products.map(toAdminProduct) });
};

// PATCH /api/admin/products/:id
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid product id");
  }

  const updates = readUpdates(req.body ?? {});

  let product;
  try {
    product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    )
      .select("name description category basePrice image isAvailable")
      .lean();
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(`A product named "${updates.name}" already exists`, 409);
    }
    throw error;
  }

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  res.json({ product: toAdminProduct(product) });
};