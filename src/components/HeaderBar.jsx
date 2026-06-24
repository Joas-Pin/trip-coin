

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '@/utils';
import { Link } from 'react-router-dom';
import notificacoesApi from "@/api/notificacoes";

export default function HeaderBar({ children }) {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadNotificacoes = async () => {
      const notifs = await notificacoesApi.listUnread(user.id, { limit: 20 });
      setNotificacoes(notifs || []);
    };
    loadNotificacoes();

    const unsubscribe = notificacoesApi.subscribeToUser(user.id, () => {
      loadNotificacoes();
    });

    const interval = setInterval(loadNotificacoes, 30000);
    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [user]);

  const marcarLida = async (notifId) => {
    await notificacoesApi.markAsRead(notifId);
    setNotificacoes(prev => prev.filter(n => n.id !== notifId));
  };

  const naoLidas = notificacoes.length;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-2">
        {children}
      </div>

      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {naoLidas > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] gradient-primary border-0">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 mr-4 mt-2 p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="font-semibold text-sm">Notificações</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notificacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma notificação nova
                </p>
              ) : (
                notificacoes.map((notif) => (
                  <Link
                    key={notif.id}
                    to={notif.viagem_id ? `/viagens/${notif.viagem_id}` : '#'}
                    onClick={() => marcarLida(notif.id)}
                    className="block p-3 hover:bg-accent/5 border-b border-border/50 last:border-0 transition-colors"
                  >
                    <div className="flex gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        notif.tipo === 'alerta' ? 'bg-amber-400' :
                        notif.tipo === 'aprovacao' ? 'bg-emerald-400' :
                        notif.tipo === 'rejeicao' ? 'bg-red-400' :
                        'bg-primary'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{notif.titulo}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {safeFormatDate(notif.created_date, "dd/MM 'às' HH:mm", ptBR)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
