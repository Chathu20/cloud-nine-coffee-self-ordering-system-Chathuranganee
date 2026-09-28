import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import CustomerLayout from "./layouts/CustomerLayout";
import StaffLayout from "./layouts/StaffLayout";
import { AuthProvider } from "./context/AuthContext";
import RequireRole from "./components/staff/RequireRole";
import WelcomePage from "./pages/customer/WelcomePage";
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import OrderSuccessPage from "./pages/customer/OrderSuccessPage";
import TrackOrderPage from "./pages/customer/TrackOrderPage";
import StaffLoginPage from "./pages/staff/StaffLoginPage";
import Placeholder from "./components/Placeholder";

// Login state is only needed on staff pages, so the kiosk never checks for a staff token
function StaffRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

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
        <Route path="/track/:token" element={<TrackOrderPage />} />

        {/* Staff */}
        <Route element={<StaffRoot />}>
          <Route path="/staff/login" element={<StaffLoginPage />} />

          {/* Baristas AND admins */}
          <Route
            element={
              <RequireRole roles={["BARISTA", "ADMIN"]}>
                <StaffLayout />
              </RequireRole>
            }
          >
            <Route path="/barista" element={<Placeholder title="Barista Board" />} />
          </Route>

          {/* Admins only */}
          <Route
            element={
              <RequireRole roles={["ADMIN"]}>
                <StaffLayout />
              </RequireRole>
            }
          >
            <Route path="/admin" element={<Placeholder title="Admin Dashboard" />} />
          </Route>
        </Route>

        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Routes>
    </BrowserRouter>
  );
}