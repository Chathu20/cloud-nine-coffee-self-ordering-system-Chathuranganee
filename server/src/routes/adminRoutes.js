import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { getDashboard } from "../controllers/adminController.js";
import { listProducts, updateProduct } from "../controllers/adminProductController.js";

const router = Router();

// Admin only – the barista cannot see sales figures or edit products
router.use(protect, authorize("ADMIN"));

router.get("/dashboard", getDashboard);

// Product details (FR-A05)
router.get("/products", listProducts);
router.patch("/products/:id", updateProduct);

export default router;