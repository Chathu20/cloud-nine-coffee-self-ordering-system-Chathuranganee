import { Outlet, useLocation } from "react-router-dom";
import { MenuProvider } from "../context/MenuContext";
import { CartProvider } from "../context/CartContext";
import IdleReset from "../components/IdleReset";
import LiveClock from "../components/LiveClock";

// Kiosk pages that have no header bar – they get a small clock in the top-right corner instead
const PAGES_WITHOUT_HEADER = ["/", "/order/success"];

// Wraps every kiosk page: shared menu data, shared cart, idle reset, and the clock
export default function CustomerLayout() {
  const { pathname } = useLocation();

  return (
    <MenuProvider>
      <CartProvider>
        <IdleReset />
        {PAGES_WITHOUT_HEADER.includes(pathname) && <LiveClock variant="floating" />}
        <Outlet />
      </CartProvider>
    </MenuProvider>
  );
}