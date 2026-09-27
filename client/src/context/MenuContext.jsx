import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/client";

const MenuContext = createContext(null);
const REFRESH_MS = 5000; // availability changes appear within 5 seconds (NFR-04)

export function MenuProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [takeawayCharge, setTakeawayCharge] = useState(0); // set by the server, shown at checkout
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/menu");
      setCategories(data.categories);
      setTakeawayCharge(data.takeawayCharge ?? 0);
      setError("");
    } catch {
      setError("Could not load the menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return (
    <MenuContext.Provider value={{ categories, takeawayCharge, loading, error, refresh }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) throw new Error("useMenu must be used inside MenuProvider");
  return context;
}