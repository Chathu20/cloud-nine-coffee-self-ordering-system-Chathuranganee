import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { announceMenuChange } from "../middleware/menuChanged.js";
import {
  getAvailability,
  setProductAvailability,
  setOptionAvailability,
} from "../controllers/availabilityController.js";
import { getOrders, advanceOrderStatus } from "../controllers/staffOrderController.js";
import { streamBoardEvents } from "../services/orderEvents.js";

const router = Router();

// Live "orders changed" signal for the order board. It sits BEFORE the login check because
// the browser's EventSource cannot send the login token. That is safe: the message carries
// no order data at all – the board then reloads the orders through the protected route below.
router.get("/orders/events", streamBoardEvents);

// Every route in this file requires a logged-in barista or admin
router.use(protect, authorize("BARISTA", "ADMIN"));

// Menu availability (sold out / back in stock) – kiosks are told straight away
router.get("/availability", getAvailability);
router.patch("/products/:id/availability", announceMenuChange, setProductAvailability);
router.patch(
  "/option-groups/:groupId/options/:optionId/availability",
  announceMenuChange,
  setOptionAvailability
);

// Order board
router.get("/orders", getOrders);
router.patch("/orders/:id/status", advanceOrderStatus);

export default router;