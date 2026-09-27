export default function CategoryTabs({ categories, active, onChange }) {
  return (
    <nav aria-label="Menu categories" className="border-b border-latte/40 bg-cream">
      <div className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-4 py-3 md:px-8">
        {categories.map((category) => {
          const isActive = category.name === active;
          return (
            <button
              key={category.name}
              type="button"
              onClick={() => onChange(category.name)}
              aria-pressed={isActive}
              className={`shrink-0 rounded-full px-5 py-3 text-base font-semibold transition ${
                isActive ? "bg-coffee text-cream" : "bg-white text-coffee hover:bg-latte/30"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}