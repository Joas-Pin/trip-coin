export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  let cleaned = value.trim();
  cleaned = cleaned.replace(/R\$\s*/i, "");
  cleaned = cleaned.replace(/\./g, "");
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

export function extractUFFromUrl(url: string): string {
  const ufPatterns = [
    /www\.sefaz\.sp\.gov\.br/i,
    /www\.sefazrs\.gov\.br/i,
    /www\.fazenda\.pr\.gov\.br/i,
    /nfce\.fazenda\.mg\.gov\.br/i,
    /www\.sefaz\.es\.gov\.br/i,
  ];

  const ufs = ["SP", "RS", "PR", "MG", "ES"];

  for (let i = 0; i < ufPatterns.length; i++) {
    if (ufPatterns[i].test(url)) {
      return ufs[i];
    }
  }

  // Try to extract from query parameters or path
  const queryMatch = url.match(/[?&]uf=([A-Z]{2})/i);
  if (queryMatch) return queryMatch[1].toUpperCase();

  const pathMatch = url.match(/\/([A-Z]{2})\//i);
  if (pathMatch) return pathMatch[1].toUpperCase();

  return "BR";
}

export function validateNFCeUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) {
    return false;
  }

  const validPatterns = [
    /nfce/i,
    /sefaz/i,
    /fazenda/i,
    /nfe/i,
  ];

  return validPatterns.some(pattern => pattern.test(url));
}

export function validateComprovanteId(id: string): boolean {
  return typeof id === "string" && id.length > 0;
}
