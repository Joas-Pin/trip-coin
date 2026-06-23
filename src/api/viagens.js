import { createCrud } from "./_crud";
import { getSupabase, unwrap, applyFilters, applyOrder } from "./_utils";
import comprovantesApi from "./comprovantes";

const crud = createCrud("viagens");

export const viagens = {
  ...crud,

  async remove(id) {
    const sb = getSupabase();

    // Delete related records first (order matters due to foreign keys)
    const tables = [
      "comprovantes",
      "aprovacoes",
      "fechamentos",
      "calculos_alimentacao",
      "despesas_diarias",
      "taxas_antecipadas",
      "trajetos",
    ];

    for (const table of tables) {
      await sb.from(table).delete().eq("viagem_id", id);
    }

    // Finally delete the viagem itself
    return crud.remove(id);
  },

  async listByIds(ids, options = {}) {
    if (!ids || ids.length === 0) return [];
    const { orderBy = "-created_at", limit } = options;
    let q = getSupabase().from("viagens").select("*").in("id", ids);
    q = applyOrder(q, orderBy);
    if (limit) q = q.limit(limit);
    return unwrap(await q);
  },

  async listForUser({ userId, role }, options = {}) {
    let filters = {};
    if (role === "colaborador") filters = { solicitante_id: userId };
    else if (role === "gestor") filters = { gestor_id: userId };
    return crud.filter(filters, options);
  },

  async updateStatus(id, status) {
    return crud.update(id, { status });
  },

  async search(text, options = {}) {
    const { orderBy = "-created_at", limit = 50 } = options;
    let q = getSupabase().from("viagens").select("*");
    if (text) {
      const t = `%${text}%`;
      q = q.or(`codigo_documento.ilike.${t},cliente_nome.ilike.${t},localidade.ilike.${t}`);
    }
    q = applyOrder(q, orderBy);
    if (limit) q = q.limit(limit);
    return unwrap(await q);
  },
};

export default viagens;

