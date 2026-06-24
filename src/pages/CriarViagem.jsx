import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/AuthContext';
import { useSecurity } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import clientesApi from "@/api/clientes";
import departamentosApi from "@/api/departamentos";
import viagensApi from "@/api/viagens";
import trajetosApi from "@/api/trajetos";
import taxasAntecipadasApi from "@/api/taxasAntecipadas";
import calculosAlimentacaoApi from "@/api/calculosAlimentacao";
import fechamentosApi from "@/api/fechamentos";
import notificacoesApi from "@/api/notificacoes";
import { listAllProfiles } from "@/api/profiles";

const MEIOS_LOCOMOCAO = ['Avião', 'Carro', 'Ônibus', 'Van', 'Trem', 'Barco', 'Outro'];
const TIPOS_TAXA = ['Hospedagem', 'Passagem Aérea', 'Aluguel de veículo', 'Outros'];

const STEPS = [
  { id: 1, label: 'Dados Gerais' },
  { id: 2, label: 'Trajetos' },
  { id: 3, label: 'Taxas Antecipadas' },
  { id: 4, label: 'Revisão' },
];

export default function CriarViagem() {
  const navigate = useNavigate();
  const { user, profile, role: _role } = useAuth();
  const { sanitizeInput, sanitizeObject, checkRateLimit } = useSecurity();
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const [dados, setDados] = useState({
    depto: '',
    dt_saida: '',
    dt_retorno: '',
    cliente_id: '',
    cliente_nome: '',
    localidade: '',
    motivo: '',
    gestor_id: '',
    gestor_nome: '',
    qtd_colaboradores: 1,
  });

  const [trajetos, setTrajetos] = useState([{
    data_saida: '',
    hora_saida: '',
    meio_locomocao: 'Carro',
    local_partida: '',
    local_chegada: '',
    hora_chegada: '',
  }]);

  const [taxas, setTaxas] = useState([{
    tipo: 'Hospedagem',
    descricao: '',
    valor: '',
    comprovante_url: '',
  }]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [clts, deps, profiles] = await Promise.all([
        clientesApi.list({ orderBy: "nome" }),
        departamentosApi.listWithGestor({ orderBy: "nome" }),
        listAllProfiles(),
      ]);
      setClientes(clts);
      setDepartamentos(deps);
      setAllProfiles(profiles);
    };
    load();
  }, [user]);

  function updateDado(field, value) {
    setDados(prev => ({ ...prev, [field]: sanitizeInput(value) }));
  }

  function handleClienteSelect(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    updateDado('cliente_id', clienteId);
    updateDado('cliente_nome', cliente?.nome || '');
    if (cliente) {
      updateDado('localidade', `${cliente.cidade || ''}/${cliente.uf || ''}`);
    }
  }

  function handleDepartamentoSelect(deptoId) {
    const depto = departamentos.find(d => d.id === deptoId);
    updateDado('depto', deptoId);
    if (depto && depto.gestor_id) {
      const gestor = allProfiles.find(p => p.id === depto.gestor_id);
      updateDado('gestor_id', depto.gestor_id);
      updateDado('gestor_nome', gestor?.nome || '');
    } else {
      updateDado('gestor_id', '');
      updateDado('gestor_nome', '');
    }
  }

  function handleGestorSelect(gestorId) {
    const gestor = allProfiles.find(g => g.id === gestorId);
    updateDado('gestor_id', gestorId);
    updateDado('gestor_nome', gestor?.nome || '');
  }

  function updateTrajeto(idx, field, value) {
    setTrajetos(prev => prev.map((t, i) => i === idx ? { ...t, [field]: sanitizeInput(value) } : t));
  }

  function addTrajeto() {
    setTrajetos(prev => [...prev, {
      data_saida: '', hora_saida: '', meio_locomocao: 'Carro',
      local_partida: '', local_chegada: '', hora_chegada: '',
    }]);
  }

  function removeTrajeto(idx) {
    setTrajetos(prev => prev.filter((_, i) => i !== idx));
  }

  function updateTaxa(idx, field, value) {
    setTaxas(prev => prev.map((t, i) => i === idx ? { ...t, [field]: sanitizeInput(value) } : t));
  }

  function addTaxa() {
    setTaxas(prev => [...prev, {
      tipo: 'Hospedagem', descricao: '', valor: '', comprovante_url: '',
    }]);
  }

  function removeTaxa(idx) {
    setTaxas(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotalTaxas = taxas.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

  async function handleSave() {
    if (!checkRateLimit('criar-viagem')) {
      alert('Muitas requisições. Por favor, tente novamente mais tarde.');
      return;
    }
    
    setSaving(true);
    const codigo = `TRIP-${Date.now().toString(36).toUpperCase()}`;
    const hoje = new Date().toISOString().split('T')[0];

    const sanitizedDados = sanitizeObject(dados);
    const sanitizedTrajetos = sanitizeObject(trajetos);
    const sanitizedTaxas = sanitizeObject(taxas);

    const viagem = await viagensApi.create({
      codigo_documento: codigo,
      revisao: '01',
      emissao: hoje,
      ultima_revisao: hoje,
      num_pag: 1,
      solicitante_id: user.id,
      solicitante_nome: profile?.nome || user.user_metadata?.full_name || user.email,
      depto: sanitizedDados.depto,
      dt_saida: sanitizedDados.dt_saida,
      dt_retorno: sanitizedDados.dt_retorno,
      cliente_id: sanitizedDados.cliente_id,
      cliente_nome: sanitizedDados.cliente_nome,
      localidade: sanitizedDados.localidade,
      motivo: sanitizedDados.motivo,
      gestor_id: sanitizedDados.gestor_id,
      gestor_nome: sanitizedDados.gestor_nome,
      qtd_colaboradores: sanitizedDados.qtd_colaboradores,
      status: 'em_andamento',
    });

    const trajetosValid = sanitizedTrajetos.filter(t => t.local_partida || t.local_chegada);
    if (trajetosValid.length > 0) {
      await trajetosApi.bulkCreate(
        trajetosValid.map((t, i) => ({
          viagem_id: viagem.id,
          ordem: i + 1,
          data_saida: t.data_saida,
          hora_saida: t.hora_saida,
          meio_locomocao: t.meio_locomocao,
          local_partida: t.local_partida,
          local_chegada: t.local_chegada,
          hora_chegada: t.hora_chegada,
        }))
      );
    }

    const taxasValid = sanitizedTaxas.filter(t => t.valor && parseFloat(t.valor) > 0);
    if (taxasValid.length > 0) {
      await taxasAntecipadasApi.bulkCreate(
        taxasValid.map(t => ({
          viagem_id: viagem.id,
          tipo: t.tipo,
          descricao: t.descricao,
          valor: parseFloat(t.valor),
          comprovante_url: t.comprovante_url,
          pago_pela_empresa: true,
        }))
      );
    }

    await calculosAlimentacaoApi.create({
      viagem_id: viagem.id,
      vi_alimentacao: 360,
      tt_alimentacao: 0,
      dias_viagem: 1,
      dif_alimentacao: 0,
    });

    await fechamentosApi.create({
      viagem_id: viagem.id,
      subtotal_taxas: subtotalTaxas,
      subtotal_despesas: 0,
      total_geral: subtotalTaxas,
      vi_adiantamento: 0,
      dif_receber_devolver: 0,
      status: 'pendente',
    });

    if (dados.gestor_id) {
      await notificacoesApi.create({
        user_id: dados.gestor_id,
        tipo: 'info',
        titulo: 'Nova viagem registrada',
        mensagem: `${profile?.nome || user.user_metadata?.full_name || user.email} criou a viagem ${codigo} para ${dados.cliente_nome || 'cliente'}.`,
        viagem_id: viagem.id,
      });
    }

    setSaving(false);
    navigate(`/viagens/${viagem.id}`);
  }

  function canProceed() {
    if (step === 1) return dados.dt_saida && dados.dt_retorno && dados.cliente_id && dados.localidade && dados.motivo;
    return true;
  }

  return (
    <div className="py-6 animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ChevronLeft className="h-3 w-3" /> Voltar
        </button>
        <h1 className="text-2xl font-bold text-foreground">Nova Viagem</h1>
        <p className="text-sm text-muted-foreground mt-1">Preencha os dados para iniciar uma viagem técnica</p>
      </div>

      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => setStep(s.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                step === s.id
                  ? 'bg-primary/10 text-primary'
                  : step > s.id
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {step > s.id ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
                  step === s.id ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                )}>{s.id}</span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'h-px flex-1',
                step > s.id + 1 ? 'bg-emerald-400/30' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Dados Gerais da Viagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Departamento</Label>
                    <Select value={dados.depto} onValueChange={handleDepartamentoSelect}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Selecionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Qtd. Colaboradores</Label>
                    <Input
                      type="number"
                      min="1"
                      value={dados.qtd_colaboradores}
                      onChange={e => updateDado('qtd_colaboradores', parseInt(e.target.value) || 1)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de Saída *</Label>
                    <Input
                      type="date"
                      value={dados.dt_saida}
                      onChange={e => updateDado('dt_saida', e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de Retorno *</Label>
                    <Input
                      type="date"
                      value={dados.dt_retorno}
                      onChange={e => updateDado('dt_retorno', e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cliente *</Label>
                    <Select value={dados.cliente_id} onValueChange={handleClienteSelect}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Localidade (Cidade/UF) *</Label>
                    <Input
                      value={dados.localidade}
                      onChange={e => updateDado('localidade', e.target.value)}
                      placeholder="Ex: São Paulo/SP"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Motivo da Viagem *</Label>
                    <Textarea
                      value={dados.motivo}
                      onChange={e => updateDado('motivo', e.target.value)}
                      placeholder="Descreva o objetivo da visita técnica..."
                      className="bg-input border-border h-20"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Gestor Responsável</Label>
                    <Input
                      value={dados.gestor_nome || 'Nenhum gestor atribuído'}
                      disabled
                      className="bg-input border-border opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Trajetos (Cronograma)</CardTitle>
                <Button variant="outline" size="sm" onClick={addTrajeto} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Adicionar Trecho
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {trajetos.map((trajeto, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border bg-background/50 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">Trecho {idx + 1}</Badge>
                      {trajetos.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => removeTrajeto(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data Saída</Label>
                        <Input type="date" value={trajeto.data_saida} onChange={e => updateTrajeto(idx, 'data_saida', e.target.value)} className="bg-input border-border text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Hora Saída</Label>
                        <Input type="time" value={trajeto.hora_saida} onChange={e => updateTrajeto(idx, 'hora_saida', e.target.value)} className="bg-input border-border text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Meio de Locomoção</Label>
                        <Select value={trajeto.meio_locomocao} onValueChange={v => updateTrajeto(idx, 'meio_locomocao', v)}>
                          <SelectTrigger className="bg-input border-border text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEIOS_LOCOMOCAO.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Local de Partida</Label>
                        <Input value={trajeto.local_partida} onChange={e => updateTrajeto(idx, 'local_partida', e.target.value)} placeholder="Cidade/UF" className="bg-input border-border text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Local de Chegada</Label>
                        <Input value={trajeto.local_chegada} onChange={e => updateTrajeto(idx, 'local_chegada', e.target.value)} placeholder="Cidade/UF" className="bg-input border-border text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Hora Chegada</Label>
                        <Input type="time" value={trajeto.hora_chegada} onChange={e => updateTrajeto(idx, 'hora_chegada', e.target.value)} className="bg-input border-border text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Taxas / Compras Antecipadas</CardTitle>
                <Button variant="outline" size="sm" onClick={addTaxa} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Adicionar Taxa
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {taxas.map((taxa, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border bg-background/50 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">Taxa {idx + 1}</Badge>
                      {taxas.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => removeTaxa(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={taxa.tipo} onValueChange={v => updateTaxa(idx, 'tipo', v)}>
                          <SelectTrigger className="bg-input border-border text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_TAXA.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={taxa.valor} onChange={e => updateTaxa(idx, 'valor', e.target.value)} placeholder="0,00" className="bg-input border-border text-sm" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Descrição</Label>
                        <Input value={taxa.descricao} onChange={e => updateTaxa(idx, 'descricao', e.target.value)} placeholder="Detalhes da taxa..." className="bg-input border-border text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                {subtotalTaxas > 0 && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Subtotal Taxas</p>
                      <p className="text-lg font-bold text-foreground">
                        R$ {subtotalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Revisão da Viagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Solicitante:</span> <span className="font-medium">{profile?.nome || user?.user_metadata?.full_name || user?.email}</span></div>
                  <div><span className="text-muted-foreground">Depto:</span> <span className="font-medium">{dados.depto || '—'}</span></div>
                  <div><span className="text-muted-foreground">Saída:</span> <span className="font-medium">{dados.dt_saida || '—'}</span></div>
                  <div><span className="text-muted-foreground">Retorno:</span> <span className="font-medium">{dados.dt_retorno || '—'}</span></div>
                  <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{dados.cliente_nome || '—'}</span></div>
                  <div><span className="text-muted-foreground">Localidade:</span> <span className="font-medium">{dados.localidade || '—'}</span></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Motivo:</span> <span className="font-medium">{dados.motivo || '—'}</span></div>
                  <div><span className="text-muted-foreground">Gestor:</span> <span className="font-medium">{dados.gestor_nome || '—'}</span></div>
                  <div><span className="text-muted-foreground">Qtd. Colaboradores:</span> <span className="font-medium">{dados.qtd_colaboradores}</span></div>
                </div>

                {trajetos.filter(t => t.local_partida || t.local_chegada).length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm font-semibold mb-2">Trajetos ({trajetos.filter(t => t.local_partida || t.local_chegada).length})</p>
                    {trajetos.filter(t => t.local_partida || t.local_chegada).map((t, i) => (
                      <div key={i} className="text-xs text-muted-foreground mb-1">
                        {t.data_saida} {t.hora_saida} — {t.local_partida} → {t.local_chegada} ({t.meio_locomocao})
                      </div>
                    ))}
                  </div>
                )}

                {subtotalTaxas > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm font-semibold mb-2">Taxas Antecipadas</p>
                    {taxas.filter(t => t.valor > 0).map((t, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{t.tipo}{t.descricao ? ` — ${t.descricao}` : ''}</span>
                        <span>R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-1 mt-1 border-t border-border/50">
                      <span>Subtotal</span>
                      <span>R$ {subtotalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          {step > 1 ? 'Anterior' : 'Cancelar'}
        </Button>

        <div className="flex gap-2">
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="gradient-primary text-white gap-1.5 shadow-lg shadow-primary/25"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-white gap-1.5 shadow-lg shadow-primary/25"
            >
              {saving ? (
                <>Salvando...</>
              ) : (
                <><Save className="h-4 w-4" /> Criar Viagem</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}