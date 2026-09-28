import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, HOME_FOR_ROLE } from "../../context/AuthContext";

// Pages each role may open (used to decide where to go after logging in)
const ALLOWED_PATHS = { BARISTA: ["/barista"], ADMIN: ["/barista", "/admin"] };

// Go back to the page they originally wanted, if their role allows it; otherwise their home page
const destinationFor = (user, from) =>
  from && ALLOWED_PATHS[user.role]?.includes(from) ? from : HOME_FOR_ROLE[user.role] ?? "/";

export default function StaffLoginPage() {
  const { user, checking, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Already logged in (e.g. opened /staff/login again) → go straight to their page
  if (!checking && user) {
    return <Navigate to={destinationFor(user, from)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const loggedIn = await login(email.trim(), password);
      navigate(destinationFor(loggedIn, from), { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError("Incorrect email or password."); // never say WHICH one was wrong
      } else if (status === 400) {
        setError(err.response.data?.message ?? "Please check your details.");
      } else {
        setError("Can't reach the server. Please check the connection and try again.");
      }
      setPassword(""); // clear the password after a failed attempt
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-espresso p-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-cream shadow-2xl">
        <div className="border-b-2 border-gold/60 bg-coffee px-8 py-6 text-center">
          <p className="font-display text-2xl uppercase tracking-[0.12em] text-gold-light">Cloud Nine</p>
          <h1 className="mt-1 text-sm uppercase tracking-widest text-cream/70">Staff sign in</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-8">
          <div className="space-y-2">
            <label htmlFor="email" className="block font-semibold text-espresso">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-latte/60 bg-white px-4 py-3 text-lg outline-none focus:border-forest"
              placeholder="name@cloudnine.lk"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block font-semibold text-espresso">
              Password
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-2 border-latte/60 bg-white px-4 py-3 text-lg outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                aria-pressed={showPassword}
                className="shrink-0 rounded-xl border-2 border-latte/60 px-3 text-sm font-semibold text-coffee hover:bg-latte/20"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || checking}
            className="w-full rounded-2xl bg-forest px-6 py-4 text-lg font-semibold text-white transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-xs text-espresso/50">For Cloud Nine staff only.</p>
        </form>
      </div>
    </main>
  );
}