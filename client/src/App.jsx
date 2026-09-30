import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import BaristaBoardPage from "./pages/staff/BaristaBoardPage";
import AdminDashboardPage from "./pages/staff/AdminDashboardPage";
import AdminMenuPage from "./pages/staff/AdminMenuPage";
import Placeholder from "./components/Placeholder";

// Each staff screen has its OWN login (admin and barista can both be logged in at once).
// Only the pages inside it check for a token, so the kiosk never looks for one.
function StaffArea({ role }) {
  return (
    <AuthProvider role={role}>
      <RequireRole roles={[role]}>
        <StaffLayout />
      </RequireRole>
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

        {/* Staff login (one page for both roles) */}
        <Route path="/staff/login" element={<StaffLoginPage />} />

        {/* Barista screen – uses the barista's login */}
        <Route element={<StaffArea role="BARISTA" />}>
          <Route path="/barista" element={<BaristaBoardPage />} />
        </Route>

        {/* Admin screen – uses the admin's login */}
        <Route element={<StaffArea role="ADMIN" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/menu" element={<AdminMenuPage />} />
          <Route path="/admin/orders" element={<BaristaBoardPage />} />
        </Route>

        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Routes>
    </BrowserRouter>
  );
}