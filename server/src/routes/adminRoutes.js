import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { getDashboard } from "../controllers/adminController.js";

const router = Router();

// Admin only – the barista cannot see sales figures
router.use(protect, authorize("ADMIN"));

router.get("/dashboard", getDashboard);

export default router;