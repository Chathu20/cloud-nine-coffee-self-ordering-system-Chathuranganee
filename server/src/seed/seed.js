import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import OptionGroup from "../models/OptionGroup.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { optionGroups, products, users } from "./data.js";

// Create the document if it doesn't exist, otherwise update it
const upsert = (Model, filter, data) =>
  Model.findOneAndUpdate(filter, data, {
    upsert: true,
    returnDocument: "after",
    runValidators: true,
    setDefaultsOnInsert: true,
  });

const seed = async () => {
  await connectDB();

  try {
    // 1. Option groups (availability reset to "available")
    const groupIdByName = {};
    for (const group of optionGroups) {
      const options = group.options.map((o) => ({ ...o, isAvailable: true }));
      const saved = await upsert(OptionGroup, { name: group.name }, { ...group, options });
      groupIdByName[group.name] = saved._id;
    }
    console.log(`✔ ${optionGroups.length} option groups`);

    // 2. Products (group names → IDs)
    for (const [index, product] of products.entries()) {
      const groupIds = product.optionGroups.map((name) => {
        if (!groupIdByName[name]) {
          throw new Error(`Unknown option group "${name}" on product "${product.name}"`);
        }
        return groupIdByName[name];
      });

      await upsert(
        Product,
        { name: product.name },
        { ...product, optionGroups: groupIds, isAvailable: true, sortOrder: index }
      );
    }
    console.log(`✔ ${products.length} products`);

    // 3. Staff users (passwords hashed)
    for (const { password, ...user } of users) {
      const passwordHash = await bcrypt.hash(password, 10);
      await upsert(User, { email: user.email }, { ...user, passwordHash });
    }
    console.log(`✔ ${users.length} staff users`);

    console.log("Seeding complete.");
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();