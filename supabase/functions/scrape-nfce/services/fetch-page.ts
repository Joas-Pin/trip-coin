import { TIMEOUT, RETRIES, RETRY_DELAYS, USER_AGENT } from "../constants.ts";
import { logger } from "../logger.ts";

export async function fetchPage(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      logger.info(`Fetching page`, { url, attempt: attempt + 1 });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      logger.info(`Page fetched successfully`, {
        url,
        attempt: attempt + 1,
        length: html.length,
      });
      return html;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Fetch failed`, {
        url,
        attempt: attempt + 1,
        error: lastError.message,
      });

      if (attempt < RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        logger.info(`Retrying in ${delay}ms`, { url, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`All fetch attempts failed`, { url, retries: RETRIES });
  throw lastError || new Error("Failed to fetch page after retries");
}
