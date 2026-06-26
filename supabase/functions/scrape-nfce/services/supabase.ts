import { createClient, SupabaseClient } from "supabase";
import { logger } from "../logger.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function getClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function updateStatus(
  comprovanteId: string,
  status: "processando" | "concluido" | "pendente"
): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from("comprovantes")
    .update({ ocr_status: status, updated_at: new Date().toISOString() })
    .eq("id", comprovanteId);

  if (error) {
    logger.error(`Failed to update status`, { comprovanteId, status, error: error.message });
    throw error;
  }

  logger.info(`Status updated`, { comprovanteId, status });
}

export async function updateValor(
  comprovanteId: string,
  valorTotal: number
): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from("comprovantes")
    .update({
      valor_total: valorTotal,
      ocr_status: "concluido",
      updated_at: new Date().toISOString(),
    })
    .eq("id", comprovanteId);

  if (error) {
    logger.error(`Failed to update valor`, { comprovanteId, valorTotal, error: error.message });
    throw error;
  }

  logger.info(`Valor updated`, { comprovanteId, valorTotal });
}

export async function updateErro(
  comprovanteId: string,
  message: string
): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from("comprovantes")
    .update({
      ocr_status: "pendente",
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", comprovanteId);

  if (error) {
    logger.error(`Failed to update erro`, { comprovanteId, message, error: error.message });
    throw error;
  }

  logger.info(`Erro updated`, { comprovanteId, message });
}
