import { useContext } from "react";
import { ToastContext } from "../context/toast-context";

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
  return ctx;
}
