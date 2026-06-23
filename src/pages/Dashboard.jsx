

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plane,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MapPin,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

const CATEGORY_COLORS = ['#4F6EF7', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4'];

export default function Dashboard() {
  const { user, profile, role } = useAuth();
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const trips = await viagensApi.listForUser(
          { userId: user.id, role },
          { orderBy: "-created_at", limit: 50 }
        );
        setViagens(trips || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, role]);

  const emAndamento = viagens.filter(v => v.status === 'em_andamento').length;
  const pendentes = viagens.filter(v => ['pendente_fechamento', 'aguardando_gestor', 'aguardando_financeiro'].includes(v.status)).length;
  const aprovadas = viagens.filter(v => v.status === 'aprovada').length;
  const rejeitadas = viagens.filter(v => v.status === 'rejeitada').length;

  // Gastos por categoria simulados (viriam do fechamento)
  const gastosCategoria = [
    { name: 'Alimentação', value: 0 },
    { name: 'Combustível', value: 0 },
    { name: 'Hospedagem', value: 0 },
    { name: 'Transporte', value: 0 },
    { name: 'Estacionamento', value: 0 },
    { name: 'Outros', value: 0 },
  ];

  const recentes = viagens.slice(0, 5);

  const stats = [
    { title: 'Em andamento', value: emAndamento, icon: Plane, gradient: 'from-blue-500/20 to-blue-600/5', iconColor: 'text-blue-400' },
    { title: 'Pendentes', value: pendentes, icon: Clock, gradient: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400' },
    { title: 'Aprovadas', value: aprovadas, icon: CheckCircle2, gradient: 'from-emerald-500/20 to-emerald-600/5', iconColor: 'text-emerald-400' },
    { title: 'Rejeitadas', value: rejeitadas, icon: AlertTriangle, gradient: 'from-red-500/20 to-red-600/5', iconColor: 'text-red-400' },
  ];

  return (
    <div className="py-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {(profile?.nome || user?.user_metadata?.full_name || 'Colaborador').split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe suas viagens técnicas</p>
        </div>
        <Link
          to="/viagens/nova"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Nova Viagem
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 bg-slate-700 mb-3" />
                <Skeleton className="h-8 w-12 bg-slate-700" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="bg-card border-border hover:border-primary/20 transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                      <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart - Gastos por Categoria */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full bg-slate-700 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gastosCategoria} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(224 25% 15%)',
                      border: '1px solid hsl(220 15% 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210 20% 95%)',
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {gastosCategoria.map((_, idx) => (
                      <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Status das Viagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full bg-slate-700 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Em andamento', value: emAndamento },
                      { name: 'Pendentes', value: pendentes },
                      { name: 'Aprovadas', value: aprovadas },
                      { name: 'Rejeitadas', value: rejeitadas },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[0, 1, 2, 3].map((idx) => (
                      <Cell key={idx} fill={CATEGORY_COLORS[idx]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(224 25% 15%)',
                      border: '1px solid hsl(220 15% 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210 20% 95%)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {[
                { label: 'Em andamento', color: CATEGORY_COLORS[0] },
                { label: 'Pendentes', color: CATEGORY_COLORS[1] },
                { label: 'Aprovadas', color: CATEGORY_COLORS[2] },
                { label: 'Rejeitadas', color: CATEGORY_COLORS[3] },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Viagens Recentes */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Viagens Recentes</CardTitle>
          <Link to="/viagens" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todas <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-slate-700 rounded-xl" />
              ))}
            </div>
          ) : recentes.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma viagem encontrada</p>
              <Link to="/viagens/nova" className="text-sm text-primary hover:underline mt-1 inline-block">
                Criar primeira viagem
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentes.map((viagem) => {
                const status = statusBadge[viagem.status] || statusBadge.rascunho;
                return (
                  <Link
                    key={viagem.id}
                    to={`/viagens/${viagem.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                        <Plane className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {viagem.cliente_nome || 'Cliente'} — {viagem.localidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {viagem.dt_saida ? format(new Date(viagem.dt_saida + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }) : '—'} até{' '}
                          {viagem.dt_retorno ? format(new Date(viagem.dt_retorno + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={`text-[10px] ${status.class} border`}>
                        {status.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
