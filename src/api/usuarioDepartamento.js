
import { createCrud } from "./_crud";
import { getSupabase } from "./_utils";

const crud = createCrud("usuario_departamento");

export const usuarioDepartamento = {
  ...crud,

  // Listar todas as atribuições
  async listAll() {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("usuario_departamento")
        .select("*");

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("Error listing usuario departamento:", e);
      return [];
    }
  },

  // Obter todas as atribuições por departamento
  async getByDepartamento(departamentoId) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("usuario_departamento")
        .select("*")
        .eq("departamento_id", departamentoId);
        
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("Atribuições não disponíveis:", e);
      return [];
    }
  },

  // Obter todas as atribuições por usuário
  async getByUsuario(usuarioId) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("usuario_departamento")
        .select("*")
        .eq("usuario_id", usuarioId);
        
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("Atribuições não disponíveis:", e);
      return [];
    }
  },

  // Atribuir usuário a departamento
  async assignUsuario(departamentoId, usuarioId, performedBy) {
    try {
      const sb = getSupabase();
      
      // First check if already assigned
      const { data: existing, error: checkError } = await sb
        .from("usuario_departamento")
        .select("*")
        .eq("departamento_id", departamentoId)
        .eq("usuario_id", usuarioId)
        .maybeSingle();
        
      if (checkError) console.warn("Error checking existing assignment:", checkError);
      
      if (existing) {
        console.log("Assignment already exists, skipping");
        return existing; // Already exists, return it
      }
      
      // Now try to insert
      const { data, error } = await sb
        .from("usuario_departamento")
        .insert({
          departamento_id: departamentoId,
          usuario_id: usuarioId,
          assigned_by: performedBy
        })
        .select();

      if (error) {
        // If it's a duplicate key error, just ignore it and get the existing one
        if (error.code === "23505") {
          console.warn("Duplicate assignment, returning existing one");
          const { data: existingFallback } = await sb
            .from("usuario_departamento")
            .select("*")
            .eq("departamento_id", departamentoId)
            .eq("usuario_id", usuarioId)
            .maybeSingle();
          return existingFallback;
        }
        throw error;
      }
      return data;
    } catch (e) {
      console.error("Falha ao atribuir usuário:", e);
      throw e;
    }
  },

  // Remover atribuição
  async unassignUsuario(departamentoId, usuarioId) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("usuario_departamento")
        .delete()
        .eq("departamento_id", departamentoId)
        .eq("usuario_id", usuarioId);

      if (error) {
        console.warn("Error unassigning user (may not exist):", error);
        // Don't throw an error if it just doesn't exist
        return null;
      }
      return data;
    } catch (e) {
      console.error("Falha ao desvincular usuário:", e);
      // Don't throw an error if it's just not existing
      return null;
    }
  }
};

export default usuarioDepartamento;
