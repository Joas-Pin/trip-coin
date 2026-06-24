import { supabase } from "@/lib/supabase";

const IS_DEV = import.meta.env.DEV;

export function getSupabase() {
  return supabase;
}

export function unwrap(result) {
  if (result.error) {
    // Only log RLS errors in DEV mode, not in PROD
    if (IS_DEV) {
      // Check if it's an RLS error (usually "not authorized" or "permission denied")
      const isRlsError = result.error.code === "PGRST301" || 
                         result.error.code === "42501" || 
                         (result.error.message && (
                           result.error.message.toLowerCase().includes("not authorized") || 
                           result.error.message.toLowerCase().includes("permission denied") ||
                           result.error.message.toLowerCase().includes("policy violation")
                         ));
      
      if (isRlsError) {
        console.debug("RLS: Acesso não autorizado (esperado para segurança):", result.error.message);
        return null; // Return null instead of throwing for RLS errors
      }
      
      // Only throw non-RLS errors
      throw result.error;
    } else {
      // In production: silently return null for all errors
      return null; 
    }
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

