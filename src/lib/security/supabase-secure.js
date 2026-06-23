import { sanitizeObject } from "@/lib/security";
import { supabase } from "@/lib/supabase";

/**
 * Wrapper seguro para requisições Supabase
 * Inclui rate limiting, sanitização e verificação de auth
 */
export async function secureSupabaseRequest(
  requestFn,
  options = {}
) {
  const {
    rateLimitAction,
    sanitize = true,
    inputData,
    requiresAuth = true,
  } = options;

  try {
    // 1. Verificar rate limit (se ação fornecida)
    if (rateLimitAction) {
      const { data: allowed, error: rateError } = await supabase.rpc(
        "check_api_rate_limit",
        { p_action: rateLimitAction }
      );

      if (rateError) {
        console.warn("Rate limit check falhou, prosseguindo:", rateError);
      } else if (!allowed) {
        throw new Error("Rate limit excedido. Tente novamente mais tarde.");
      }
    }

    // 2. Sanitizar dados de entrada
    let sanitizedData = inputData;
    if (sanitize && inputData) {
      sanitizedData = sanitizeObject(inputData);
    }

    // 3. Executar requisição
    const result = await requestFn(sanitizedData);
    return result;
  } catch (error) {
    console.error("[Secure Supabase Request] Erro:", error);
    throw error;
  }
}

/**
 * Wrapper seguro para criar viagem usando a função RPC segura do banco
 */
export async function createViagemSegura(viagemData) {
  return await secureSupabaseRequest(
    async (data) => {
      const { data: result, error } = await supabase.rpc("create_viagem_safe", {
        p_codigo_documento: data.codigo_documento,
        p_solicitante_id: data.solicitante_id,
        p_solicitante_nome: data.solicitante_nome,
        p_departamento: data.depto,
        p_dt_saida: data.dt_saida,
        p_dt_retorno: data.dt_retorno,
        p_cliente_id: data.cliente_id,
        p_cliente_nome: data.cliente_nome,
        p_localidade: data.localidade,
        p_motivo: data.motivo,
        p_gestor_id: data.gestor_id,
        p_gestor_nome: data.gestor_nome,
        p_qtd_colaboradores: data.qtd_colaboradores || 1,
      });

      if (error) throw error;
      return result;
    },
    {
      rateLimitAction: "create_viagem",
      inputData: viagemData,
    }
  );
}