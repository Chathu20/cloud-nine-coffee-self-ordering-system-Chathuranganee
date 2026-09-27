import { useNavigate } from "react-router-dom";
import CoffeeCup from "../../components/CoffeeCup";
import { useMenu } from "../../context/MenuContext";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { loading, error } = useMenu();

  return (
    <button
      type="button"
      onClick={() => navigate("/menu")}
      aria-label="Tap to start your order"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-cream p-8 text-center"
    >
      <CoffeeCup className="h-56 w-56 md:h-72 md:w-72" />

      <h1 className="fade-up text-4xl font-bold text-coffee md:text-6xl" style={{ animationDelay: "1.2s" }}>
        Cloud Nine Coffee Bar
      </h1>

      <p className="fade-up text-lg text-espresso/80 md:text-2xl" style={{ animationDelay: "1.6s" }}>
        Freshly brewed, just the way you like it
      </p>

      <span className="fade-up mt-4" style={{ animationDelay: "2s" }}>
        <span className="soft-pulse inline-block rounded-full bg-forest px-10 py-5 text-xl font-semibold text-white shadow-lg md:text-2xl">
          Tap anywhere to start
        </span>
      </span>

      <p className="h-6 text-sm text-espresso/60">
        {error ? "Having trouble reaching the menu – please ask a staff member" : loading ? "Brewing the menu…" : ""}
      </p>
    </button>
  );
}