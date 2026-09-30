// ---------- Customization groups (shared across products) ----------
export const optionGroups = [
  {
    name: "Size",
    required: true,
    options: [
      { name: "Regular", priceDelta: 0, isDefault: true },
      { name: "Large", priceDelta: 150 },
    ],
  },
  {
    name: "Milk",
    required: true,
    options: [
      { name: "Full Cream Milk", priceDelta: 0, isDefault: true },
      { name: "Oat Milk", priceDelta: 0 },
      { name: "Almond Milk", priceDelta: 0 },
    ],
  },
  {
    name: "Flavour",
    required: false,
    options: [
      { name: "Vanilla", priceDelta: 50 },
      { name: "Caramel", priceDelta: 50 },
      { name: "Hazelnut", priceDelta: 50 },
    ],
  },
  {
    name: "Extra Shot",
    required: false,
    options: [{ name: "Add Extra Espresso Shot", priceDelta: 100 }],
  },
];

// ---------- Menu items (prices in LKR) ----------
// optionGroups lists group NAMES; the seed script converts them to IDs.
export const products = [
  {
    name: "Cappuccino",
    description: "Espresso with steamed milk and a thick layer of foam",
    category: "Hot Coffee",
    basePrice: 750,
    image: "/images/cappuccino.jpg",
    optionGroups: ["Size", "Milk"],
  },
  {
    name: "Hot Latte",
    description: "Smooth espresso with steamed milk and light foam",
    category: "Hot Coffee",
    basePrice: 800,
    image: "/images/hot-latte.jpg",
    optionGroups: ["Size", "Milk", "Flavour", "Extra Shot"],
  },
  {
    name: "Americano",
    description: "Espresso topped with hot water for a clean, bold taste",
    category: "Hot Coffee",
    basePrice: 600,
    image: "/images/americano.jpg",
    optionGroups: ["Size"],
  },
  {
    name: "Iced Latte",
    description: "Espresso with cold milk poured over ice",
    category: "Iced Coffee",
    basePrice: 850,
    image: "/images/iced-latte.jpg",
    optionGroups: ["Size", "Milk", "Flavour", "Extra Shot"],
  },
  {
    name: "Iced Mocha",
    description: "Espresso, chocolate and cold milk over ice",
    category: "Iced Coffee",
    basePrice: 950,
    image: "/images/iced-mocha.jpg",
    optionGroups: ["Size", "Milk", "Extra Shot"],
  },
  {
    name: "Hot Chocolate",
    description: "Rich chocolate blended with steamed milk",
    category: "Other Drinks",
    basePrice: 700,
    image: "/images/hot-chocolate.jpg",
    optionGroups: ["Size", "Milk"],
  },
  {
    name: "Butter Croissant",
    description: "Flaky, golden croissant baked fresh every morning",
    category: "Food",
    basePrice: 450,
    image: "/images/butter-croissant.jpg",
    optionGroups: [],
  },
  {
    name: "Chocolate Muffin",
    description: "Soft muffin loaded with chocolate chips",
    category: "Food",
    basePrice: 500,
    image: "/images/chocolate-muffin.jpg",
    optionGroups: [],
  },
];

// ---------- Staff accounts (demo only) ----------
export const users = [
  { name: "Cloud Nine Barista", email: "barista@cloudnine.lk", password: "Barista@123", role: "BARISTA" },
  { name: "Cloud Nine Admin", email: "admin@cloudnine.lk", password: "Admin@123", role: "ADMIN" },
];