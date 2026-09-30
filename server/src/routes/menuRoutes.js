import { Router } from "express";
import { getMenu } from "../controllers/menuController.js";
import { streamMenuEvents } from "../services/menuEvents.js";

const router = Router();

router.get("/", getMenu);

// Live updates: the kiosk keeps this open and is told the moment the menu changes
router.get("/events", streamMenuEvents);

export default router;