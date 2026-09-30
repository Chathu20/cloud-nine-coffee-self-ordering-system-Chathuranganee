import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/client";

const MenuContext = createContext(null);

// Live updates: the server tells this screen the moment a barista or admin changes the menu.
// The slow timer below is only a safety net in case the live connection is ever blocked.
const EVENTS_URL = "/api/menu/events";
const SAFETY_REFRESH_MS = 30_000;

export function MenuProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRequest = useRef(0); // only the newest answer is used (answers can arrive out of order)

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const { data } = await api.get("/menu");
      if (requestId !== latestRequest.current) return; // a newer request was sent meanwhile
      setCategories(data.categories);
      setError("");
    } catch {
      if (requestId === latestRequest.current) setError("Could not load the menu");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // 1. Live: reload as soon as the server says "menu-changed"
    const events = new EventSource(EVENTS_URL);
    events.addEventListener("menu-changed", refresh);
    // After a dropped connection comes back, reload once in case something changed meanwhile
    let connectedBefore = false;
    events.onopen = () => {
      if (connectedBefore) refresh();
      connectedBefore = true;
    };

    // 2. Safety net + when the kiosk screen becomes active again
    const timer = setInterval(refresh, SAFETY_REFRESH_MS);
    window.addEventListener("focus", refresh);

    return () => {
      events.close();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return (
    <MenuContext.Provider value={{ categories, loading, error, refresh }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) throw new Error("useMenu must be used inside MenuProvider");
  return context;
}