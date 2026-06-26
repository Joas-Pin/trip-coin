export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  let cleaned = value.trim();
  // Remove R$
  cleaned = cleaned.replace(/R\$\s*/i, "");
  // Remove thousands separators
  cleaned = cleaned.replace(/\./g, "");
  // Replace comma with dot
  cleaned = cleaned.replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function extractChaveAcesso(text: string): string | null {
  const match = text.match(/\b(\d{44})\b/);
  return match ? match[1] : null;
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
