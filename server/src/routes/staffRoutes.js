import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getAvailability,
  setProductAvailability,
  setOptionAvailability,
} from "../controllers/availabilityController.js";

const router = Router();

// Every route in this file requires a logged-in barista or admin
router.use(protect, authorize("BARISTA", "ADMIN"));

router.get("/availability", getAvailability);
router.patch("/products/:id/availability", setProductAvailability);
router.patch("/option-groups/:groupId/options/:optionId/availability", setOptionAvailability);

export default router;