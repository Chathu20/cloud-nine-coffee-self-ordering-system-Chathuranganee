import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireRole from "./components/staff/RequireRole";
import Placeholder from "./components/Placeholder";

// Each screen is loaded only when it is opened ("code splitting").
// The customer's phone (QR tracking page) then downloads just the tracking page –
// not the kiosk, the barista board, the admin dashboard or its charts.
const CustomerLayout = lazy(() => import("./layouts/CustomerLayout"));
const StaffLayout = lazy(() => import("./layouts/StaffLayout"));
const WelcomePage = lazy(() => import("./pages/customer/WelcomePage"));
const MenuPage = lazy(() => import("./pages/customer/MenuPage"));
const CartPage = lazy(() => import("./pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("./pages/customer/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("./pages/customer/OrderSuccessPage"));
const TrackOrderPage = lazy(() => import("./pages/customer/TrackOrderPage"));
const StaffLoginPage = lazy(() => import("./pages/staff/StaffLoginPage"));
const BaristaBoardPage = lazy(() => import("./pages/staff/BaristaBoardPage"));
const AdminDashboardPage = lazy(() => import("./pages/staff/AdminDashboardPage"));
const AdminMenuPage = lazy(() => import("./pages/staff/AdminMenuPage"));

// Shown for the split second while a screen's code is downloading
function ScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="animate-pulse text-5xl" aria-label="Loading">
        ☕
      </p>
    </div>
  );
}

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
      <Suspense fallback={<ScreenLoading />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
