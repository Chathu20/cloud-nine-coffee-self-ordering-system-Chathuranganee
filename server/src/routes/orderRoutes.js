import { Router } from "express";
import { createOrder, confirmPayment, trackOrder } from "../controllers/orderController.js";

const router = Router();

router.post("/", createOrder);
router.get("/confirm", confirmPayment);
router.get("/track/:token", trackOrder);

export default router;