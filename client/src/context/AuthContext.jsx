import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEYS } from "../api/client";

const AuthContext = createContext(null);

// Where each role goes after logging in
export const HOME_FOR_ROLE = { BARISTA: "/barista", ADMIN: "/admin" };

// Used by the login page: signs in and saves the token in THAT role's own slot,
// so logging in as admin never logs the barista out (and the other way round)
export async function loginStaff(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  const key = TOKEN_KEYS[data.user.role];
  if (!key) throw new Error("Unknown staff role");
  localStorage.setItem(key, data.token);
  return data.user;
}

// role = "ADMIN" or "BARISTA": which saved login this part of the app uses
export function AuthProvider({ role, children }) {
  const tokenKey = TOKEN_KEYS[role];
  const [user, setUser] = useState(null);
  // If a token is saved, we must ask the server who it belongs to before showing staff pages
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(tokenKey)));

  // Only removes THIS screen's login – the other role stays logged in
  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setUser(null);
  }, [tokenKey]);

  // On page load / refresh: turn the saved token back into a logged-in user
  useEffect(() => {
    if (!localStorage.getItem(tokenKey)) return;

    api
      .get("/auth/me")
      .then(({ data }) => {
        // A token in the wrong slot (shouldn't happen) is treated as logged out
        if (data.user.role === role) setUser(data.user);
        else logout();
      })
      .catch(() => logout()) // expired, invalid or deleted account → start again at the login page
      .finally(() => setChecking(false));
  }, [tokenKey, role, logout]);

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

  const value = useMemo(() => ({ user, checking, logout }), [user, checking, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}