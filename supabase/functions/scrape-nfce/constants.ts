export const TIMEOUT = 30000;
export const RETRIES = 3;
export const RETRY_DELAYS = [500, 1000, 2000] as const;
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
export const VALID_NFCE_KEYWORDS = ["nfce", "sefaz", "fazenda", "nfe"] as const;
export const TOTAL_KEYWORDS = [
  "valor total",
  "total da nota",
  "valor da nota",
] as const;
