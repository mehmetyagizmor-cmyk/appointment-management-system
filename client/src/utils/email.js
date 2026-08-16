const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw) {
  return EMAIL_PATTERN.test(String(raw || "").trim());
}
