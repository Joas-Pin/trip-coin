import { VALID_NFCE_KEYWORDS } from "./constants.ts";

export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  let cleaned = value.trim();
  cleaned = cleaned.replace(/R\$\s*/i, "");
  cleaned = cleaned.replace(/\./g, "");
  cleaned = cleaned.replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function validateUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lowerUrl = url.toLowerCase();
  return VALID_NFCE_KEYWORDS.some((keyword) => lowerUrl.includes(keyword));
}

export function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
