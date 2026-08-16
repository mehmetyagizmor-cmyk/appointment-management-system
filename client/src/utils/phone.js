const PHONE_PATTERN = /^0?5\d{9}$/; // 05XXXXXXXXX ya da 5XXXXXXXXX (TR cep telefonu)

export function isValidPhone(raw) {
  return PHONE_PATTERN.test(String(raw || "").replace(/\D/g, ""));
}
