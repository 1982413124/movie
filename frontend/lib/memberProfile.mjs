function normalizeText(value) {
  return String(value ?? "").trim();
}

export function maskEmail(value) {
  const email = normalizeText(value);
  const separatorIndex = email.lastIndexOf("@");

  if (separatorIndex <= 0 || separatorIndex === email.length - 1) {
    return "";
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  const visibleLength = Math.min(2, localPart.length);

  return `${localPart.slice(0, visibleLength)}***@${domain}`;
}

export function maskPhone(value) {
  const digits = normalizeText(value).replace(/\D/g, "");

  if (digits.length < 4) {
    return "";
  }

  const suffix = digits.slice(-4);

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${suffix}`;
  }

  if (digits.length === 10) {
    const prefixLength = digits.startsWith("03") || digits.startsWith("06") ? 2 : 3;
    return `${digits.slice(0, prefixLength)}-****-${suffix}`;
  }

  return `****-${suffix}`;
}

export function formatMemberSince(value) {
  const source = normalizeText(value);

  if (!source) {
    return "";
  }

  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
