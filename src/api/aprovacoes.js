import { createCrud } from "./_crud";
import { getSupabase, unwrap, applyOrder } from "./_utils";

const crud = createCrud("aprovacoes");

export const aprovacoes = {
  ...crud,

  async listByViagemIds(viagemIds, options = {}) {
    if (!viagemIds || viagemIds.length === 0) return [];
    const { orderBy = "-created_at", limit } = options;
    let q = getSupabase().from("aprovacoes").select("*").in("viagem_id", viagemIds);
    q = applyOrder(q, orderBy);
    if (limit) q = q.limit(limit);
    return unwrap(await q);
  },

  async findPending({ viagemId, tipo }) {
    const q = getSupabase()
      .from("aprovacoes")
      .select("*")
      .eq("viagem_id", viagemId)
      .eq("tipo", tipo)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1);
    const data = unwrap(await q);
    return data[0] || null;
  },
};

export default aprovacoes;

