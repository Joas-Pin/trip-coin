

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Plane, ChevronRight, Search, Filter } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '@/utils';
import viagensApi from "@/api/viagens";

const statusBadge = {
  rascunho: { label: 'Rascunho', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  em_andamento: { label: 'Em andamento', class: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  pendente_fechamento: { label: 'Pendente', class: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  aguardando_gestor: { label: 'Aguardando Gestor', class: 'bg-violet-400/10 text-violet-400 border-violet-400/20' },
  aguardando_financeiro: { label: 'Aguardando Financeiro', class: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' },
  aprovada: { label: 'Aprovada', class: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  rejeitada: { label: 'Rejeitada', class: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

export default function MinhasViagens() {
  const { user, role } = useAuth();
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const trips = await viagensApi.listForUser(
          { userId: user.id, role },
          { orderBy: "-created_at", limit: 100 }
        );
        setViagens(trips || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, role]);

  const filtered = viagens.filter(v => {
    const matchSearch = !search || 
      (v.codigo_documento?.toLowerCase().includes(search.toLowerCase()) ||
       v.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
       v.localidade?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'todas' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="py-6 animate-fade-in max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {role === 'colaborador' ? 'Minhas Viagens' : 
             role === 'gestor' ? 'Viagens da Equipe' : 'Todas as Viagens'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{viagens.length} viagens encontradas</p>
        </div>
        <Link to="/viagens/nova" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4" /> Nova Viagem
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente ou localidade..."
            className="pl-9 bg-input border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-input border-border">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="pendente_fechamento">Pendentes</SelectItem>
            <SelectItem value="aguardando_gestor">Aguardando Gestor</SelectItem>
            <SelectItem value="aguardando_financeiro">Aguardando Financeiro</SelectItem>
            <SelectItem value="aprovada">Aprovadas</SelectItem>
            <SelectItem value="rejeitada">Rejeitadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-700 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma viagem encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((viagem) => {
                const st = statusBadge[viagem.status] || statusBadge.rascunho;
                return (
                  <Link
                    key={viagem.id}
                    to={`/viagens/${viagem.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-accent/5 transition-colors group gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                        <Plane className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{viagem.codigo_documento}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {viagem.cliente_nome} — {viagem.localidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {safeFormatDate(viagem.dt_saida, "dd/MM/yy", ptBR)} →{' '}
                          {safeFormatDate(viagem.dt_retorno, "dd/MM/yy", ptBR)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={`text-[10px] ${st.class} border`}>
                        {st.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
