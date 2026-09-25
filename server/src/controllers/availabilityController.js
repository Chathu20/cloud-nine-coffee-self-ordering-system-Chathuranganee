import mongoose from "mongoose";
import Product from "../models/Product.js";
import OptionGroup from "../models/OptionGroup.js";

// Checks that the body is exactly { isAvailable: true|false }
const readIsAvailable = (req, res) => {
  const { isAvailable } = req.body ?? {};
  if (typeof isAvailable !== "boolean") {
    res.status(400).json({ message: "isAvailable must be true or false" });
    return null;
  }
  return isAvailable;
};

// GET /api/staff/availability – everything the barista can switch on/off
export const getAvailability = async (req, res) => {
  const [products, optionGroups] = await Promise.all([
    Product.find().select("name category isAvailable").sort({ sortOrder: 1 }).lean(),
    OptionGroup.find().select("name required options._id options.name options.isAvailable").lean(),
  ]);

  res.set("Cache-Control", "no-store");
  res.json({ products, optionGroups });
};

// PATCH /api/staff/products/:id/availability
export const setProductAvailability = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const isAvailable = readIsAvailable(req, res);
  if (isAvailable === null) return;

  const product = await Product.findByIdAndUpdate(
    id,
    { isAvailable },
    { returnDocument: "after", runValidators: true }
  ).select("name category isAvailable");

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ product });
};

// PATCH /api/staff/option-groups/:groupId/options/:optionId/availability
export const setOptionAvailability = async (req, res) => {
  const { groupId, optionId } = req.params;
  if (!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(optionId)) {
    return res.status(400).json({ message: "Invalid option group or option id" });
  }

  const isAvailable = readIsAvailable(req, res);
  if (isAvailable === null) return;

  const optionGroup = await OptionGroup.findOneAndUpdate(
    { _id: groupId, "options._id": optionId },
    { $set: { "options.$.isAvailable": isAvailable } },
    { returnDocument: "after" }
  ).select("name required options._id options.name options.isAvailable");

  if (!optionGroup) {
    return res.status(404).json({ message: "Option not found" });
  }

  res.json({ optionGroup });
};