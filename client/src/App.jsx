import { useEffect, useState } from "react";
import api from "./api/client";

const SWATCHES = [
  { name: "Espresso", className: "bg-espresso" },
  { name: "Coffee", className: "bg-coffee" },
  { name: "Latte", className: "bg-latte" },
  { name: "Cream", className: "bg-cream border border-latte" },
  { name: "Forest", className: "bg-forest" },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setHealth(res.data))
      .catch(() => setError("Cannot reach the API. Is the server running on port 5000?"));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-coffee">Cloud Nine Coffee Bar</h1>

        <div className="flex justify-center gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="space-y-1">
              <div className={`h-12 w-12 rounded-xl ${s.className}`} />
              <p className="text-xs">{s.name}</p>
            </div>
          ))}
        </div>

        {error && <p className="font-medium text-red-700">{error}</p>}
        {!error && !health && <p>Checking API…</p>}
        {health && (
          <p className="font-semibold text-forest">
            API: {health.status} · Database: {health.database}
          </p>
        )}

        <button className="w-full rounded-2xl bg-forest py-4 text-lg font-semibold text-white transition hover:bg-forest-dark">
          Start Order
        </button>
      </div>
    </main>
  );
}