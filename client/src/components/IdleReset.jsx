import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const IDLE_MS = 90_000; // 90 seconds without a touch → back to the welcome screen
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"];

export default function IdleReset() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { clearCart } = useCart();

  useEffect(() => {
    if (pathname === "/") return; // already on the welcome screen

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