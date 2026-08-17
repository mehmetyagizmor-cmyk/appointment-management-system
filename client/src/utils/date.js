const LOCALES = { tr: "tr-TR", en: "en-US" };

export function formatDateLabel(iso, lang = "tr") {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(LOCALES[lang] || LOCALES.tr, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateLabelLong(iso, lang = "tr") {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(LOCALES[lang] || LOCALES.tr, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
