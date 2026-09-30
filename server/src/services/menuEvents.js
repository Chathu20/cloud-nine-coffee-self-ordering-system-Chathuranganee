// Live "the menu changed" messages for the customer screens (Server-Sent Events).
// Each open kiosk keeps one connection here; when a barista or admin saves a change,
// every kiosk is told straight away and reloads the menu.

const clients = new Set(); // open kiosk connections
const HEARTBEAT_MS = 25_000; // keeps the connection alive through proxies and routers
const GROUP_MS = 150; // several quick changes in a row → one message

let pendingTimer = null;

// GET /api/menu/events – the kiosk connects here with EventSource
export const streamMenuEvents = (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // don't let a proxy hold the messages back
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n"); // if the connection drops, the browser reconnects after 3 s

  clients.add(res);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
};

// Tell every connected kiosk that the menu changed
export const notifyMenuChanged = () => {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const message = `event: menu-changed\ndata: ${Date.now()}\n\n`;
    for (const res of clients) res.write(message);
  }, GROUP_MS);
};