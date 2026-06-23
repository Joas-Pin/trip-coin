import { getSupabase, unwrap, applyFilters, applyOrder } from "./_utils";

export function createCrud(table) {
  return {
    async list(options = {}) {
      const { orderBy = "-created_at", limit } = options;
      let q = getSupabase().from(table).select("*");
      q = applyOrder(q, orderBy);
      if (limit) q = q.limit(limit);
      return unwrap(await q);
    },

    async filter(filters = {}, options = {}) {
      const { orderBy = "-created_at", limit } = options;
      let q = getSupabase().from(table).select("*");
      q = applyFilters(q, filters);
      q = applyOrder(q, orderBy);
      if (limit) q = q.limit(limit);
      return unwrap(await q);
    },

    async getById(id) {
      const q = getSupabase().from(table).select("*").eq("id", id).single();
      return unwrap(await q);
    },

    async create(payload) {
      const q = getSupabase().from(table).insert(payload).select("*").single();
      return unwrap(await q);
    },

    async bulkCreate(rows) {
      const q = getSupabase().from(table).insert(rows).select("*");
      return unwrap(await q);
    },

    async update(id, patch) {
      const q = getSupabase().from(table).update(patch).eq("id", id).select("*").single();
      return unwrap(await q);
    },

    async remove(id) {
      const q = getSupabase().from(table).delete().eq("id", id);
      await unwrap(await q);
      return true;
    },
  };
}