// Türkiye numaralarını wa.me'nin beklediği "ülke kodu + numara" formatına çevirir
// (05xxxxxxxxx / 5xxxxxxxxx -> 905xxxxxxxxx). Otomatik mesaj gönderemez, sadece
// önceden doldurulmuş bir sohbet penceresi açar (Meta API onayı gerektirmez).
export function toWhatsAppNumber(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `9${digits}`;
  if (digits.length === 10) return `90${digits}`;
  return digits.length >= 10 ? digits : null;
}

export function buildWhatsAppLink(rawPhone, message) {
  const number = toWhatsAppNumber(rawPhone);
  if (!number) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${query}`;
}
