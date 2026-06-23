
import { createCrud } from "./_crud";
import { getSupabase } from "./_utils";

const crud = createCrud("departamento_audit_logs");

export const departamentoAudit = {
  ...crud,

  // Log de ação
  async logAction({ action, entityType, entityId, oldValues, newValues, performedBy, ipAddress, userAgent }) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("departamento_audit_logs")
        .insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_values: oldValues,
          new_values: newValues,
          performed_by: performedBy,
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .select();

      if (error) {
        console.warn("Falha ao gravar log de auditoria (table might not exist):", error);
      }
      return data;
    } catch (e) {
      console.warn("Log de auditoria não disponível:", e);
      return null;
    }
  },

  // Obter todos os logs
  async getLogs(limit = 100) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("departamento_audit_logs")
        .select(`
          *,
          profiles!departamento_audit_logs_performed_by_fkey (
            id,
            nome,
            email
          )
        `)
        .order("performed_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("Logs de auditoria não disponíveis:", e);
      return [];
    }
  }
};

export default departamentoAudit;
