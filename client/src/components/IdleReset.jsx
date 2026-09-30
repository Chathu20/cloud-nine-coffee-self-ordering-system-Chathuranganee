import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const IDLE_MS = 90_000; // 90 seconds without a touch → back to the welcome screen
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"];

// Pages where the kiosk never goes back to the welcome screen by itself:
//   "/"     – it IS the welcome screen
//   "/menu" – customers can take as long as they like to choose
const NO_TIMEOUT_PAGES = ["/", "/menu"];

export default function IdleReset() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { clearCart } = useCart();

  useEffect(() => {
    if (NO_TIMEOUT_PAGES.includes(pathname)) return; // no timer on these pages

    let timer;
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearCart();
        navigate("/");
      }, IDLE_MS);
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, restart, { passive: true }));
    restart();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, restart));
    };
  }, [pathname, navigate, clearCart]);

  return null;
}