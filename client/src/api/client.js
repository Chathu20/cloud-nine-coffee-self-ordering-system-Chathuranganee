import axios from "axios";

// All requests go to "/api/..." – Vite forwards them to the Express server
const api = axios.create({ baseURL: "/api" });

// Each staff screen keeps its OWN login, so an admin and a barista can both stay
// logged in at the same time – even in two tabs of the same browser.
export const TOKEN_KEYS = { ADMIN: "cn_token_admin", BARISTA: "cn_token_barista" };

// Which login a page uses is decided by its address
export const roleForPath = (path) => {
  if (path.startsWith("/admin")) return "ADMIN";
  if (path.startsWith("/barista")) return "BARISTA";
  return null; // kiosk, login page, tracking page → no staff token
};

// Clean up the old single shared key from before this change
localStorage.removeItem("cn_token");

// Attach the token that belongs to the page this request comes from
api.interceptors.request.use((config) => {
  const role = roleForPath(window.location.pathname);
  const token = role && localStorage.getItem(TOKEN_KEYS[role]);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;