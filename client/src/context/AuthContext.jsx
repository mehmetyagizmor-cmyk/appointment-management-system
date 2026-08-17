import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!getToken()) {
        setChecking(false);
        return;
      }
      try {
        const me = await api.get("/api/auth/me");
        if (!cancelled) setUsername(me.username);
      } catch {
        if (!cancelled) setToken(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (usernameInput, password) => {
    const data = await api.post(
      "/api/auth/login",
      { username: usernameInput, password },
      { auth: false }
    );
    setToken(data.token);
    setUsername(data.username);
    return data;
  }, []);

  const register = useCallback(async ({ businessName, username: usernameInput, password, ownerEmail }) => {
    const data = await api.post(
      "/api/business/register",
      { businessName, username: usernameInput, password, ownerEmail },
      { auth: false }
    );
    setToken(data.token);
    setUsername(data.username);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
  }, []);

  const value = {
    username,
    isAuthenticated: !!username,
    checking,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
