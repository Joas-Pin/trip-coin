import { createCrud } from "./_crud";
import { getSupabase, unwrap } from "./_utils";

const crud = createCrud("notificacoes");

export const notificacoes = {
  ...crud,

  async listUnread(userId, options = {}) {
    const { limit = 20 } = options;
    const q = getSupabase()
      .from("notificacoes")
      .select("*")
      .eq("user_id", userId)
      .eq("lida", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    return unwrap(await q);
  },

  async markAsRead(id) {
    const q = getSupabase().from("notificacoes").update({ lida: true }).eq("id", id);
    await unwrap(await q);
    return true;
  },

  subscribeToUser(userId, onChange) {
    const channel = getSupabase()
      .channel(`notificacoes:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${userId}` },
        (payload) => onChange?.(payload)
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  },
};

export default notificacoes;

