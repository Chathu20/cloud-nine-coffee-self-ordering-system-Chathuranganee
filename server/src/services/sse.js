// Shared helpers for Server-Sent Events (SSE) – one-way live messages from the server to the browser.
// Used by the kiosk menu, the barista order board and the customer tracking page.

const PING_MS = 15_000; // a small "ping" keeps the connection open AND proves it is really live

// Turn this request into a long-lived event stream and remember it in `clients`.
// `onClose` runs after the browser disconnects (tab closed, phone locked, network lost).
export const openEventStream = (req, res, clients, onClose) => {
  res.set({
    "Content-Type": "text/event-stream",
    // "no-transform" stops Cloudflare (the phone tunnel) from compressing the stream –
    // compression makes it hold messages back instead of sending each one straight away
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // same idea for nginx-style proxies
  });
  res.flushHeaders();

  // ~2 KB of padding: some proxies wait for a minimum amount of data before passing anything on
  res.write(`:${" ".repeat(2048)}\n\n`);
  res.write("retry: 3000\n\n"); // if the connection drops, the browser reconnects after 3 s
  res.write("event: ready\ndata: ok\n\n"); // lets the browser confirm messages arrive without delay

  clients.add(res);

  const ping = setInterval(() => res.write("event: ping\ndata: ok\n\n"), PING_MS);

  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
    onClose?.();
  });
};

// Send a named event to every connection in `clients`.
// The message carries no data – the browser reloads through the normal API,
// so the usual checks (login, what each screen is allowed to see) still apply.
export const sendEvent = (clients, eventName) => {
  const message = `event: ${eventName}\ndata: ${Date.now()}\n\n`;
  for (const res of clients) res.write(message);
};
