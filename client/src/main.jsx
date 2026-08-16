import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { ToastProvider } from "./context/ToastContext";
import { SettingsProvider } from "./context/SettingsContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
