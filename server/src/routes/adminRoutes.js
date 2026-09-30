import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { announceMenuChange } from "../middleware/menuChanged.js";
import { getDashboard } from "../controllers/adminController.js";
import {
  listProducts,
  listOptionGroups,
  createProduct,
  updateProduct,
  removeProduct,
  restoreProduct,
} from "../controllers/adminProductController.js";
import { acceptImage, uploadImage } from "../controllers/uploadController.js";

const router = Router();

// Admin only – the barista cannot see sales figures or manage the menu
router.use(protect, authorize("ADMIN"));

router.get("/dashboard", getDashboard);

// Menu management: add, edit (FR-A05), remove and restore products.
// Every successful change is announced to the kiosks straight away.
router.get("/products", listProducts);
router.post("/products", announceMenuChange, createProduct);
router.patch("/products/:id", announceMenuChange, updateProduct);
router.delete("/products/:id", announceMenuChange, removeProduct);
router.patch("/products/:id/restore", announceMenuChange, restoreProduct);

// Photo upload for the product form (the returned URL is saved as the product's image)
router.post("/uploads", acceptImage, uploadImage);

// Choices for the product form (Size, Milk, Flavour…)
router.get("/option-groups", listOptionGroups);

export default router;