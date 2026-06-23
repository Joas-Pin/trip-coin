import { supabase } from "@/lib/supabase";

export function getSupabase() {
  return supabase;
}

export function unwrap(result) {
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export function applyFilters(query, filters) {
  if (!filters) return query;
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      query = query.is(key, null);
      return;
    }
    if (Array.isArray(value)) {
      query = query.in(key, value);
      return;
    }
    query = query.eq(key, value);
  });
  return query;
}

export function applyOrder(query, orderBy) {
  if (!orderBy) return query;
  if (typeof orderBy === "string") {
    const descending = orderBy.startsWith("-");
    const column = descending ? orderBy.slice(1) : orderBy;
    return query.order(column, { ascending: !descending });
  }
  const { column, ascending = false } = orderBy;
  return query.order(column, { ascending });
}

