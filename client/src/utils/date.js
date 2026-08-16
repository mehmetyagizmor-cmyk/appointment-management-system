export function formatDateLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateLabelLong(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
