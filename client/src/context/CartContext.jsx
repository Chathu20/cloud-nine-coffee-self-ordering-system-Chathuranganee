import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const CART_KEY = "cn_cart";
const MAX_QUANTITY = 20; // same limit as the server

// Load the saved cart safely (bad or missing data → empty cart)
const loadCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// Same product + same options = same cart line
const lineKey = (productId, optionIds) => `${productId}:${[...optionIds].sort().join(",")}`;

const clampQuantity = (quantity) => Math.max(1, Math.min(quantity, MAX_QUANTITY));

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  // Save on every change, so a page refresh keeps the cart
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  // item: { productId, name, image, unitPrice, quantity, options: [{ group, name, optionId }] }
  const addItem = useCallback((item) => {
    const optionIds = item.options.map((option) => option.optionId);
    const key = lineKey(item.productId, optionIds);

    setItems((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: clampQuantity(line.quantity + item.quantity) } : line
        );
      }
      return [...current, { ...item, key, optionIds, quantity: clampQuantity(item.quantity) }];
    });
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setItems((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: clampQuantity(quantity) } : line))
    );
  }, []);

  // Replace one line with an edited version (new options and/or quantity), keeping its place in the list.
  // If the edit makes it identical to another line, the two are merged into one.
  const replaceItem = useCallback((oldKey, item) => {
    const optionIds = item.options.map((option) => option.optionId);
    const key = lineKey(item.productId, optionIds);

    setItems((current) => {
      const position = current.findIndex((line) => line.key === oldKey);
      const others = current.filter((line) => line.key !== oldKey);

      if (others.some((line) => line.key === key)) {
        return others.map((line) =>
          line.key === key ? { ...line, quantity: clampQuantity(line.quantity + item.quantity) } : line
        );
      }

      const edited = { ...item, key, optionIds, quantity: clampQuantity(item.quantity) };
      others.splice(position < 0 ? others.length : position, 0, edited);
      return others;
    });
  }, []);

  const removeItem = useCallback((key) => {
    setItems((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return { items, itemCount, subtotal, addItem, replaceItem, updateQuantity, removeItem, clearCart };
  }, [items, addItem, replaceItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}