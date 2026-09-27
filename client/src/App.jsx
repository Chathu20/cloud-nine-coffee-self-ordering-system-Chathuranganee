import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomerLayout from "./layouts/CustomerLayout";
import WelcomePage from "./pages/customer/WelcomePage";
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import OrderSuccessPage from "./pages/customer/OrderSuccessPage";
import Placeholder from "./components/Placeholder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Kiosk – shared menu, cart and idle reset */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/success" element={<OrderSuccessPage />} />
        </Route>

        {/* Customer's phone (from the QR code) */}
        <Route path="/track/:token" element={<Placeholder title="Track Your Order" />} />

        {/* Staff */}
        <Route path="/staff/login" element={<Placeholder title="Staff Login" />} />
        <Route path="/barista" element={<Placeholder title="Barista Board" />} />
        <Route path="/admin" element={<Placeholder title="Admin Dashboard" />} />

        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Routes>
    </BrowserRouter>
  );
}