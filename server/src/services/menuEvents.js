// Live "the menu changed" messages for the customer screens (Server-Sent Events).
// Each open kiosk keeps one connection here; when a barista or admin saves a change,
// every kiosk is told straight away and reloads the menu.
import { openEventStream, sendEvent } from "./sse.js";

const clients = new Set(); // open kiosk connections
const GROUP_MS = 150; // several quick changes in a row → one message

let pendingTimer = null;

// GET /api/menu/events – the kiosk connects here with EventSource
export const streamMenuEvents = (req, res) => openEventStream(req, res, clients);

// Tell every connected kiosk that the menu changed
export const notifyMenuChanged = () => {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => sendEvent(clients, "menu-changed"), GROUP_MS);
};
