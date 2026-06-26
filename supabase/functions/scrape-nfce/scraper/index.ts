import { fetchPage } from "./fetch-page.ts";

export async function scrapePage(url: string): Promise<string> {
  try {
    // First try with simple fetch
    return await fetchPage(url);
  } catch (error) {
    console.error("Fetch failed, trying browser fallback:", error);
    // Browser fallback not available in Edge Functions, rethrow
    throw error;
  }
}
