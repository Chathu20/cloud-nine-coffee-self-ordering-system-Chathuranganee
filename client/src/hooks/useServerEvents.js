import { useEffect, useState } from "react";

const READY_TIMEOUT_MS = 5_000; // the server's "ready" message must arrive within 5 s of connecting
const SILENCE_LIMIT_MS = 35_000; // the server pings every 15 s – this long without one means trouble

// Keeps a live Server-Sent Events connection open to `url` and calls `onEvent`
// every time the server sends `eventName`.
//
// Returns true only while messages are PROVEN to arrive straight away. If a network or
// tunnel holds messages back (or the connection drops), it returns false, so the page
// can fall back to checking every few seconds – the customer never has to refresh.
//
// `onEvent` must be stable (wrap it in useCallback), otherwise the connection
// would be reopened on every render.
export default function useServerEvents(url, eventName, onEvent, enabled = true) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const events = new EventSource(url);
    let watchdog = null;

    // If the next sign of life doesn't come in time, stop trusting the connection
    const expectSignalWithin = (ms) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => setLive(false), ms);
    };
    const markAlive = () => {
      setLive(true);
      expectSignalWithin(SILENCE_LIMIT_MS);
    };

    events.addEventListener("ready", markAlive);
    events.addEventListener("ping", markAlive);
    events.addEventListener(eventName, () => {
      markAlive();
      onEvent();
    });

    // After a dropped connection comes back, reload once in case something changed meanwhile
    let connectedBefore = false;
    events.onopen = () => {
      if (connectedBefore) onEvent();
      connectedBefore = true;
      expectSignalWithin(READY_TIMEOUT_MS);
    };
    // The browser reconnects by itself (after 3 s)
    events.onerror = () => setLive(false);

    return () => {
      clearTimeout(watchdog);
      events.close();
    };
  }, [url, eventName, onEvent, enabled]);

  return enabled && live;
}
