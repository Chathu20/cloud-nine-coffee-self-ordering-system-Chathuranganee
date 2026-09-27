import { Outlet } from "react-router-dom";
import { MenuProvider } from "../context/MenuContext";
import { CartProvider } from "../context/CartContext";
import IdleReset from "../components/IdleReset";

// Wraps every kiosk page: shared menu data, shared cart, idle reset
export default function CustomerLayout() {
  return (
    <MenuProvider>
      <CartProvider>
        <IdleReset />
        <Outlet />
      </CartProvider>
    </MenuProvider>
  );
}