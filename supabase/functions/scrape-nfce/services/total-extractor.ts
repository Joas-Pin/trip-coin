import { EXTRACTORS } from "../extractors/index.ts";
import { logger } from "../logger.ts";

export async function extractTotal(html: string): Promise<number> {
  for (let i = 0; i < EXTRACTORS.length; i++) {
    const extractor = EXTRACTORS[i];
    const extractorName = extractor.constructor.name;
    logger.debug(`Trying extractor`, { extractor: extractorName });

    try {
      const valor = extractor.extract(html);
      if (valor > 0) {
        logger.info(`Valor found`, { extractor: extractorName, valor });
        return valor;
      }
    } catch (error) {
      logger.warn(`Extractor failed`, {
        extractor: extractorName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.error(`No extractor found value`);
  throw new Error("Valor total não encontrado.");
}
