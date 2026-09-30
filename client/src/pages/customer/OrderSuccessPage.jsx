import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../../api/client";
import { useCart } from "../../context/CartContext";
import { formatLKR } from "../../utils/format";

// The QR code must open on the customer's PHONE, so it can't point to "localhost".
// Set VITE_PUBLIC_URL in client/.env (e.g. http://192.168.1.41:5173); otherwise use this page's address.
const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, "");

const ORDER_TYPE_LABEL = { DINE_IN: "Dine-In", TAKEAWAY: "Takeaway" };

// The confirmation screen (with the QR code) goes back to the welcome screen by itself after this long,
// so the next customer never sees someone else's order. Only this screen does this.
const AUTO_RETURN_SECONDS = 60;

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null); // { message, canRetry }
  const [loading, setLoading] = useState(Boolean(sessionId));
  const requestedFor = useRef(null); // stops React StrictMode from confirming twice
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RETURN_SECONDS);

  const confirm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The server asks Stripe whether this session was really paid – we never trust the URL alone
      const { data } = await api.get("/orders/confirm", { params: { session_id: sessionId } });
      setOrder(data.order);
      clearCart(); // paid → the cart's job is done
    } catch (err) {
      const status = err.response?.status;
      if (status === 402) {
        setError({ message: "Your payment hasn't gone through yet.", canRetry: true });
      } else if (status === 400 || status === 404) {
        setError({ message: "We couldn't find this order.", canRetry: false });
      } else {
        setError({ message: "We couldn't reach the server to confirm your order.", canRetry: true });
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, clearCart]);

  useEffect(() => {
    if (!sessionId || requestedFor.current === sessionId) return;
    requestedFor.current = sessionId;
    confirm();
  }, [sessionId, confirm]);

  // Once the order is confirmed and the QR code is showing, count down 60 s, then go to the welcome screen.
  // The countdown uses a fixed end time, so it stays accurate even if the browser is busy.
  useEffect(() => {
    if (!order) return;
    const endsAt = Date.now() + AUTO_RETURN_SECONDS * 1000;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) navigate("/", { replace: true }); // replace: Back can't return to this screen
    };

    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [order, navigate]);

  // No session id in the address → nobody came here from Stripe
  if (!sessionId) {
    return (
      <Screen>
        <p className="text-5xl" aria-hidden="true">🤔</p>
        <h1 className="text-2xl font-bold text-coffee">Nothing to confirm here</h1>
        <HomeButton />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <p className="animate-pulse text-6xl" aria-hidden="true">☕</p>
        <h1 role="status" className="text-2xl font-bold text-coffee">
          Confirming your payment…
        </h1>
        <p className="text-espresso/70">This only takes a moment.</p>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <p className="text-5xl" aria-hidden="true">⚠️</p>
        <h1 role="alert" className="text-2xl font-bold text-coffee">
          {error.message}
        </h1>
        <p className="text-espresso/70">If you were charged, please show this screen to a staff member.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {error.canRetry && (
            <button
              type="button"
              onClick={confirm}
              className="rounded-2xl bg-forest px-8 py-4 text-lg font-semibold text-white hover:bg-forest-dark"
            >
              Try again
            </button>
          )}
          <Link
            to="/cart"
            className="rounded-2xl border-2 border-forest px-8 py-4 text-lg font-semibold text-forest hover:bg-forest/5"
          >
            Back to cart
          </Link>
        </div>
      </Screen>
    );
  }

  const trackingUrl = `${PUBLIC_URL}/track/${order.trackingToken}`;

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <main className="mx-auto max-w-3xl space-y-6">
        {/* Order number – the most important thing on the screen */}
        <section className="rounded-3xl bg-forest p-8 text-center text-white shadow">
          <p className="text-5xl" aria-hidden="true">✅</p>
          <h1 className="mt-2 text-2xl font-semibold">Thank you! Your order is confirmed</h1>
          <p className="mt-4 text-sm uppercase tracking-widest text-white/70">Your order number</p>
          <p className="text-6xl font-bold tracking-wide md:text-7xl">{order.orderNumber}</p>
          <p className="mt-3 text-white/80">
            {ORDER_TYPE_LABEL[order.orderType]} · We'll call this number when it's ready
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* QR code for tracking on the phone */}
          <section className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-espresso">Track your order</h2>
            <div className="rounded-2xl bg-white p-3 ring-1 ring-latte">
              <QRCodeSVG value={trackingUrl} size={180} level="M" fgColor="#074A21" marginSize={1} />
            </div>
            <p className="text-sm text-espresso/70">
              Scan with your phone camera to see when your order is being prepared and ready.
            </p>
          </section>

          {/* Receipt */}
          <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-espresso">Your order</h2>
            <ul className="divide-y divide-latte/40">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-espresso">
                      {item.quantity} × {item.name}
                    </p>
                    {item.options.length > 0 && (
                      <p className="text-sm text-espresso/60">{item.options.map((o) => o.name).join(" · ")}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-espresso">{formatLKR(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-latte/60 pt-3 text-espresso/80">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatLKR(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tip{order.tipPercent > 0 ? ` (${order.tipPercent}%)` : ""}</dt>
                <dd>{formatLKR(order.tipAmount)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-lg font-bold text-forest">
                <dt>Total paid</dt>
                <dd>{formatLKR(order.totalAmount)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="w-full rounded-2xl bg-coffee px-6 py-5 text-xl font-semibold text-cream transition hover:bg-espresso"
        >
          Done – start a new order
        </button>

        {/* Countdown to the automatic return */}
        <div className="space-y-2" aria-live="polite">
          <p className="text-center text-sm text-espresso/60">
            Returning to the start in <span className="font-semibold tabular-nums text-coffee">{secondsLeft}</span>{" "}
            second{secondsLeft === 1 ? "" : "s"} – scan the QR code before then.
          </p>
          <div className="mx-auto h-1.5 max-w-sm overflow-hidden rounded-full bg-latte/30" aria-hidden="true">
            <div
              className="h-full rounded-full bg-forest transition-[width] duration-300 ease-linear"
              style={{ width: `${(secondsLeft / AUTO_RETURN_SECONDS) * 100}%` }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Centred card used for the loading / error / empty states
function Screen({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-lg flex-col items-center gap-4 rounded-3xl bg-white p-10 text-center shadow-sm">
        {children}
      </div>
    </main>
  );
}

function HomeButton() {
  return (
    <Link
      to="/"
      className="rounded-2xl bg-forest px-8 py-4 text-lg font-semibold text-white hover:bg-forest-dark"
    >
      Go to the start
    </Link>
  );
}