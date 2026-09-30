import { Link } from "react-router-dom";

// Temporary page used until each real page is built
export default function Placeholder({ title }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-coffee">{title}</h1>
      <p className="text-espresso/70">This page is coming soon.</p>
      <Link to="/" className="text-forest underline">
        Back to start
      </Link>
    </main>
  );
}