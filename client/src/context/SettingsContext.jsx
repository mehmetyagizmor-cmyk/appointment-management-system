import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { SettingsContext } from "./settings-context";

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get("/api/settings");
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
