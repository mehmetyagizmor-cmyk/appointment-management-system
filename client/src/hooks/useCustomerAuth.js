import { useContext } from "react";
import { CustomerAuthContext } from "../context/customer-auth-context";

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth, CustomerAuthProvider içinde kullanılmalı.");
  return ctx;
}
