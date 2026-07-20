const NFC_CONTEXT_KEYS = ["uid", "publicId", "nfcSession"] as const;

export function decodeNfcRedirect(value: string | null | undefined) {
  if (!value) return "";

  let candidate = value;
  if (!candidate.startsWith("/")) {
    try {
      candidate = decodeURIComponent(value);
    } catch {
      return "";
    }
  }

  try {
    const url = new URL(candidate, "https://linkup.local");
    if (url.origin !== "https://linkup.local" || url.pathname !== "/connect-nfc") {
      return "";
    }

    return NFC_CONTEXT_KEYS.some((key) => Boolean(url.searchParams.get(key)))
      ? `${url.pathname}${url.search}`
      : "";
  } catch {
    return "";
  }
}
