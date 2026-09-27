import axios from "axios";

// All requests go to "/api/..." – Vite forwards them to the Express server
const api = axios.create({ baseURL: "/api" });

// If a staff member is logged in, attach their token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cn_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;