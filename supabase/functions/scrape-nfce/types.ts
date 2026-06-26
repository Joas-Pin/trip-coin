export interface ScrapeResult {
  valorTotal: number;
}

export interface TotalExtractor {
  extract(html: string): number;
}
