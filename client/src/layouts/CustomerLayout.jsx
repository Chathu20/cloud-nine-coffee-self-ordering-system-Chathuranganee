import { Outlet, useLocation } from "react-router-dom";
import { MenuProvider } from "../context/MenuContext";
import { CartProvider } from "../context/CartContext";
import LiveClock from "../components/LiveClock";

// Kiosk pages that have no header bar – they get a small clock in the top-right corner instead
const PAGES_WITHOUT_HEADER = ["/", "/order/success"];

// Wraps every kiosk page: shared menu data, shared cart and the clock.
// There is no automatic return to the welcome screen – pages stay open until the customer moves on.
// "key={pathname}" restarts the fade-in each time the customer moves to another page.
export default function CustomerLayout() {
  const { pathname } = useLocation();

  return (
    <MenuProvider>
      <CartProvider>
        {PAGES_WITHOUT_HEADER.includes(pathname) && <LiveClock variant="floating" />}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </CartProvider>
    </MenuProvider>
  );
}