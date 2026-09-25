import { Router } from "express";
import { createOrder, confirmPayment } from "../controllers/orderController.js";

const router = Router();

router.post("/", createOrder);
router.get("/confirm", confirmPayment);

export default router;