// 2750 → "LKR 2,750"
export const formatLKR = (amount) => `LKR ${Number(amount).toLocaleString("en-LK")}`;