// Bir işletme adını URL-güvenli bir "slug"a çevirir (ör. "Vitrin Kuaför Stüdyosu" -> "vitrin-kuafor-studyosu").
// Faz 1'de işletme kayıtlarını isimlendirmek için, Faz 3'te ise kendi kendine kayıt olan
// işletmelerin herkese açık randevu adresini (/:slug) üretmek için kullanılacak.

const TR_CHAR_MAP = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  İ: "i",
  Ç: "c",
  Ğ: "g",
  Ö: "o",
  Ş: "s",
  Ü: "u",
};

function slugify(input) {
  const withAsciiTr = String(input || "").replace(
    /[çğıöşüİÇĞÖŞÜ]/g,
    (ch) => TR_CHAR_MAP[ch] || ch
  );

  const slug = withAsciiTr
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // kalan aksanları temizle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "isletme";
}

module.exports = { slugify };
