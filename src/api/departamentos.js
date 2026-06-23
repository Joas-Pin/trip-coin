import { createCrud } from "./_crud";
import { getSupabase } from "./_utils";

const crud = createCrud("departamentos");

export const departamentos = {
  ...crud,

  // Obter departamentos com gestor
  async listWithGestor(options = {}) {
    const sb = getSupabase();
    
    // First try with simple select
    let query = sb.from("departamentos").select("*");
    
    if (options.orderBy) {
      const [column, direction] = options.orderBy.startsWith('-') 
        ? [options.orderBy.slice(1), { ascending: false }] 
        : [options.orderBy, { ascending: true }];
      query = query.order(column, direction);
    }
    
    const { data, error } = await query;
    if (error) {
      console.warn("Error fetching departamentos:", error);
      throw error;
    }
    
    return data || [];
  },

  // Obter departamento completo com usuários associados
  async getWithUsuarios(id) {
    const sb = getSupabase();
    
    try {
      const { data, error } = await sb
        .from("departamentos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("Error fetching departamento details:", e);
      return this.get(id);
    }
  }
};

export default departamentos;

