import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "supabase";
import { scrapePage } from "./scraper/index.ts";
import { getParser } from "./parsers/index.ts";
import type { NFCeData } from "./types.ts";
import { logger } from "./logger.ts";
import { validateNFCeUrl, validateComprovanteId } from "./utils.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TIMEOUT_MS = 30000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function readJsonBody(req: Request): Promise<{ url?: string; comprovanteId?: string }> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function updateComprovanteStatus(
  supabase: SupabaseClient,
  comprovanteId: string,
  data: Partial<{
    valor_total: number;
    chave_acesso: string;
    data_emissao: string;
    emitente: string;
    cnpj: string;
    nfce_json: NFCeData;
    ocr_status: string;
    error_message: string;
    updated_at: string;
  }>
) {
  const { error } = await supabase
    .from("comprovantes")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", comprovanteId);

  if (error) {
    logger.error("Failed to update comprovante", { comprovanteId, error });
    throw error;
  }
}

async function handleScrapeRequest(req: Request): Promise<Response> {
  const startTime = Date.now();
  let comprovanteId: string | undefined;

  try {
    const body = await readJsonBody(req);
    const { url } = body;
    comprovanteId = body.comprovanteId;

    logger.info("Received scrape request", {
      hasUrl: !!url,
      hasComprovanteId: !!comprovanteId,
    });

    // Validate input
    if (!url || !validateNFCeUrl(url)) {
      logger.warn("Invalid URL", { url });
      return new Response(
        JSON.stringify({ error: "URL inválida ou não reconhecida como NFC-e" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!comprovanteId || !validateComprovanteId(comprovanteId)) {
      logger.warn("Missing or invalid comprovanteId", { comprovanteId });
      return new Response(
        JSON.stringify({ error: "ID do comprovante inválido ou ausente" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    await updateComprovanteStatus(supabase, comprovanteId, {
      ocr_status: "processando",
    });

    // Scrape the page with timeout
    logger.info("Starting page scrape", { url, comprovanteId });
    const html = await withTimeout(scrapePage(url), TIMEOUT_MS);
    logger.info("Page scraped successfully", {
      url,
      htmlLength: html.length,
      duration: Date.now() - startTime,
    });

    // Parse the HTML
    logger.info("Starting HTML parsing", { url, comprovanteId });
    const parser = getParser(url);
    const nfceData: NFCeData = await parser.parse(html);
    nfceData.urlConsulta = url;

    logger.info("NFC-e data parsed successfully", {
      chaveAcesso: nfceData.chaveAcesso,
      valorTotal: nfceData.valorTotal,
      emitente: nfceData.emitente,
      duration: Date.now() - startTime,
    });

    // Update comprovante with parsed data
    await updateComprovanteStatus(supabase, comprovanteId, {
      valor_total: nfceData.valorTotal,
      chave_acesso: nfceData.chaveAcesso,
      data_emissao: nfceData.dataEmissao,
      emitente: nfceData.emitente,
      cnpj: nfceData.cnpj,
      nfce_json: nfceData,
      ocr_status: "concluido",
    });

    logger.info("Scrape completed successfully", {
      comprovanteId,
      totalDuration: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ success: true, data: nfceData }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logger.error("Error processing scrape request", {
      error: errorMessage,
      comprovanteId,
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });

    if (comprovanteId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateComprovanteStatus(supabase, comprovanteId, {
          ocr_status: "pendente",
          error_message: errorMessage,
        });
      } catch (dbError) {
        logger.error("Failed to update comprovante error status", {
          comprovanteId,
          dbError: dbError instanceof Error ? dbError.message : "Unknown DB error",
        });
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

serve(handleScrapeRequest);
