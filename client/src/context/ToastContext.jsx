import { useCallback, useEffect, useState } from "react";
import { ToastContext } from "./toast-context";

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}`} key={toast.key} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
