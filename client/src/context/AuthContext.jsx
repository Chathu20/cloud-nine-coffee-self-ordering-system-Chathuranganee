import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);
const TOKEN_KEY = "cn_token"; // the same key the API client reads

// Where each role goes after logging in
export const HOME_FOR_ROLE = { BARISTA: "/barista", ADMIN: "/admin" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If a token is saved, we must ask the server who it belongs to before showing staff pages
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // On page load / refresh: turn a saved token back into a logged-in user
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;

    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => logout()) // expired, invalid or deleted account → start again at the login page
      .finally(() => setChecking(false));
  }, [logout]);

  // If ANY later staff request says "401 – not logged in" (e.g. the token expired), log out
  useEffect(() => {
    const id = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        if (error.response?.status === 401 && !isLoginRequest) logout();
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}