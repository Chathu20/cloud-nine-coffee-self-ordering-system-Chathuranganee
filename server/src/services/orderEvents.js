// Live order updates (Server-Sent Events) for:
//   • the barista order board  – told whenever ANY order is paid or changes status
//   • the customer tracking page – told only when THEIR order changes
import { openEventStream, sendEvent } from "./sse.js";

const boardClients = new Set(); // open barista / admin order boards
const trackingClients = new Map(); // trackingToken → open tracking pages for that order
const GROUP_MS = 150; // several quick changes in a row → one message to the boards

let boardTimer = null;

// GET /api/staff/orders/events – the order board connects here
export const streamBoardEvents = (req, res) => openEventStream(req, res, boardClients);

// Called by GET /api/orders/track/:token/events after the token has been checked
export const openTrackingStream = (req, res, trackingToken) => {
  let clients = trackingClients.get(trackingToken);
  if (!clients) {
    clients = new Set();
    trackingClients.set(trackingToken, clients);
  }

  openEventStream(req, res, clients, () => {
    // Last phone for this order disconnected → forget the order
    if (clients.size === 0 && trackingClients.get(trackingToken) === clients) {
      trackingClients.delete(trackingToken);
    }
  });
};

// An order was paid or moved to a new status
export const notifyOrderChanged = (trackingToken) => {
  clearTimeout(boardTimer);
  boardTimer = setTimeout(() => sendEvent(boardClients, "orders-changed"), GROUP_MS);

  const clients = trackingClients.get(trackingToken);
  if (clients) sendEvent(clients, "order-updated");
};
