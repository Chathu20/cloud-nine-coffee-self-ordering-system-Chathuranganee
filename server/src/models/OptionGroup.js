import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  priceDelta: { type: Number, default: 0, min: 0 },
  isAvailable: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
});

const optionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    required: { type: Boolean, default: false },
    options: {
      type: [optionSchema],
      validate: {
        validator: (options) => options.length > 0,
        message: "An option group must have at least one option",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("OptionGroup", optionGroupSchema);