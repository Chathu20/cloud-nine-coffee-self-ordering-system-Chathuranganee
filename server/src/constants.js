export const CATEGORIES = ["Hot Coffee", "Iced Coffee", "Other Drinks", "Food"];

export const ORDER_TYPES = ["DINE_IN", "TAKEAWAY"];

export const ORDER_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  NEW: "NEW",
  PREPARING: "PREPARING",
  READY: "READY",
  COMPLETED: "COMPLETED",
};

// The only allowed forward moves on the barista board
export const NEXT_STATUS = {
  NEW: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

export const PAYMENT_STATUS = ["UNPAID", "PAID"];

export const ROLES = ["BARISTA", "ADMIN"];

// Tip options shown at checkout (percent of subtotal); 0 = no tip
export const TIP_PERCENTAGES = [0, 5, 10, 15];