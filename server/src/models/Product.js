import mongoose from "mongoose";
import { CATEGORIES } from "../constants.js";
import "./OptionGroup.js"; // registers the OptionGroup model, needed for populate("optionGroups")

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    basePrice: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true }, // barista: temporarily sold out
    isArchived: { type: Boolean, default: false }, // admin: removed from the menu (kept for history)
    optionGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "OptionGroup" }],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Filter for "products that are on the menu" – products created before
// isArchived existed have no such field, so "not true" (instead of "false") includes them
export const ON_MENU = { isArchived: { $ne: true } };

export default mongoose.model("Product", productSchema);