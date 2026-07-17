export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "No date";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "No timestamp";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatTimestampLabel(label: string, date: Date | null | undefined) {
  return date ? `${label} ${formatDateTime(date)}` : `${label} time unavailable`;
}
