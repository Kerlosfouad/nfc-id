import { describe, expect, it } from "vitest";
import { decodeNfcRedirect } from "../nfcRedirect";

describe("decodeNfcRedirect", () => {
  it.each([
    "/connect-nfc?uid=04%3AAA%3ABB",
    "/connect-nfc?publicId=ABC123",
    "/connect-nfc?nfcSession=session_123",
  ])("accepts NFC setup context from %s", (redirect) => {
    expect(decodeNfcRedirect(redirect)).toBe(redirect);
    expect(decodeNfcRedirect(encodeURIComponent(redirect))).toBe(redirect);
  });

  it.each([
    null,
    "",
    "/connect-nfc",
    "/connect-nfc?unrelated=value",
    "/dashboard",
    "https://example.com/connect-nfc?uid=123",
    "//example.com/connect-nfc?uid=123",
  ])("rejects missing or unsafe context from %s", (redirect) => {
    expect(decodeNfcRedirect(redirect)).toBe("");
  });
});
