export default function CategoryTabs({ categories, active, onChange }) {
  return (
    <nav aria-label="Menu categories" className="bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto border-b border-latte/50 px-4 md:gap-10 md:px-8">
        {categories.map((category) => {
          const isActive = category.name === active;
          return (
            <button
              key={category.name}
              type="button"
              onClick={() => onChange(category.name)}
              aria-pressed={isActive}
              className={`relative shrink-0 py-4 font-display text-lg uppercase tracking-wider transition md:text-xl ${
                isActive ? "text-coffee" : "text-espresso/55 hover:text-espresso"
              }`}
            >
              {category.name}
              {/* Gold underline under the active tab */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-1 rounded-full transition ${isActive ? "bg-gold" : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}