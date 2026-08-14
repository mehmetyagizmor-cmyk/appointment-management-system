import { useContext } from "react";
import { SettingsContext } from "../context/settings-context";

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings, SettingsProvider içinde kullanılmalı.");
  return ctx;
}
