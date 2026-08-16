import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client";
import { CustomerAuthContext } from "./customer-auth-context";

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!getToken("customer")) {
        setChecking(false);
        return;
      }
      try {
        const me = await api.get("/api/customer/me", { auth: "customer" });
        if (!cancelled) setCustomer(me);
      } catch {
        if (!cancelled) setToken(null, "customer");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (phone, password) => {
    const data = await api.post(
      "/api/customer/login",
      { phone, password },
      { auth: false }
    );
    setToken(data.token, "customer");
    setCustomer({ id: data.id, name: data.name, phone: data.phone, email: data.email });
    return data;
  }, []);

  const register = useCallback(async (name, phone, password, email) => {
    const data = await api.post(
      "/api/customer/register",
      { name, phone, password, email },
      { auth: false }
    );
    setToken(data.token, "customer");
    setCustomer({ id: data.id, name: data.name, phone: data.phone, email: data.email });
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null, "customer");
    setCustomer(null);
  }, []);

  const value = {
    customer,
    isAuthenticated: !!customer,
    checking,
    login,
    register,
    logout,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}
