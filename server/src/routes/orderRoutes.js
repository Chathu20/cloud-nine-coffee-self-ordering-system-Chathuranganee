import { Router } from "express";
import {
  createOrder,
  confirmPayment,
  trackOrder,
  streamTrackingEvents,
} from "../controllers/orderController.js";

const router = Router();

router.post("/", createOrder);
router.get("/confirm", confirmPayment);
router.get("/track/:token", trackOrder);
router.get("/track/:token/events", streamTrackingEvents); // live updates for the tracking page

export default router;