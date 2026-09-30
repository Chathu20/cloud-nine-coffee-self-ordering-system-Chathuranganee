import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth, HOME_FOR_ROLE } from "../../context/AuthContext";

// Shows the page only to logged-in staff with one of the allowed roles.
// (This is for a friendly user experience – the SERVER is what really protects the data.)
export default function RequireRole({ roles, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p role="status" className="text-lg text-espresso/70">
          Checking your session…
        </p>
      </main>
    );
  }

  // Not logged in → go to the login page, and remember where they were heading
  if (!user) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }

  // Logged in, but this page isn't for their role (e.g. a barista opening /admin)
  if (!roles.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-md space-y-4 rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-5xl" aria-hidden="true">🔒</p>
          <h1 className="text-2xl font-bold text-coffee">You don't have access to this page</h1>
          <p className="text-espresso/70">This page is only for {roles.join(" / ").toLowerCase()} accounts.</p>
          <Link
            to={HOME_FOR_ROLE[user.role] ?? "/staff/login"}
            className="inline-block rounded-2xl bg-forest px-6 py-3 font-semibold text-white hover:bg-forest-dark"
          >
            Go to my page
          </Link>
        </div>
      </main>
    );
  }

  return children;
}