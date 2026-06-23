

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, Ban, ChevronRight } from 'lucide-react';
import aprovacoesApi from "@/api/aprovacoes";
import viagensApi from "@/api/viagens";

export default function Aprovacoes() {
  const { user, role } = useAuth();
  const [aprovacoes, setAprovacoes] = useState([]);
  const [viagensMap, setViagensMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        let apr = [];

        if (role === "gestor") {
          apr = await aprovacoesApi.filter(
            { aprovador_id: user.id, tipo: "gestor" },
            { orderBy: "-created_at", limit: 50 }
          );
        } else if (role === "financeiro") {
          apr = await aprovacoesApi.filter(
            { tipo: "financeiro" },
            { orderBy: "-created_at", limit: 50 }
          );
        } else if (role === "admin") {
          apr = await aprovacoesApi.list({ orderBy: "-created_at", limit: 50 });
        } else {
          const minhasViagens = await viagensApi.filter(
            { solicitante_id: user.id },
            { orderBy: "-created_at", limit: 200 }
          );
          const ids = minhasViagens.map((v) => v.id);
          apr = await aprovacoesApi.listByViagemIds(ids, { orderBy: "-created_at", limit: 200 });
        }

        const viagemIds = [...new Set((apr || []).map((a) => a.viagem_id))];
        const viagensData = {};
        const viagensList = await viagensApi.listByIds(viagemIds);
        (viagensList || []).forEach((v) => {
          viagensData[v.id] = v;
        });

        setAprovacoes(apr || []);
        setViagensMap(viagensData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, role]);

  const pendentes = aprovacoes.filter(a => a.status === 'pendente');
  const resolvidas = aprovacoes.filter(a => a.status !== 'pendente');

  return (
    <div className="py-6 animate-fade-in max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aprovações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as prestações de contas pendentes</p>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="pendentes" className="text-xs">
            Pendentes
            {pendentes.length > 0 && (
              <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] gradient-primary border-0">
                {pendentes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolvidas" className="text-xs">Resolvidas</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4 space-y-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-slate-700 rounded-xl" />)
          ) : pendentes.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma aprovação pendente</p>
              </CardContent>
            </Card>
          ) : (
            pendentes.map(a => {
              const v = viagensMap[a.viagem_id];
              return (
                <Link key={a.id} to={`/viagens/${a.viagem_id}`}>
                  <Card className="bg-card border-border hover:border-primary/20 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {v?.codigo_documento || 'Viagem'} — {v?.cliente_nome || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v?.solicitante_nome || '—'} • {v?.localidade || '—'}
                          </p>
                          <Badge className="text-[10px] mt-1 bg-primary/10 text-primary border-primary/20">
                            {a.tipo === 'gestor' ? 'Aprovação do Gestor' : 'Aprovação Financeira'}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="resolvidas" className="mt-4 space-y-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-slate-700 rounded-xl" />)
          ) : resolvidas.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma aprovação resolvida</p>
              </CardContent>
            </Card>
          ) : (
            resolvidas.map(a => {
              const v = viagensMap[a.viagem_id];
              return (
                <Link key={a.id} to={`/viagens/${a.viagem_id}`}>
                  <Card className="bg-card border-border hover:border-primary/20 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          a.status === 'aprovada' ? 'bg-emerald-400/10' : 'bg-red-400/10'
                        }`}>
                          {a.status === 'aprovada' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Ban className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {v?.codigo_documento || 'Viagem'} — {v?.cliente_nome || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.aprovador_nome} • {a.tipo === 'gestor' ? 'Gestor' : 'Financeiro'}
                          </p>
                          {a.comentario && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{a.comentario}"</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
