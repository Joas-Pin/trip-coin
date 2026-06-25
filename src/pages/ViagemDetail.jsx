

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft, Plane, Plus, Trash2, CheckCircle2, Circle, FileText, Upload, Calculator,
  Send, ArrowRight, Download, Ban, Eye, Image as ImageIcon, FileType, Loader2, QrCode,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import viagensApi from "@/api/viagens";
import trajetosApi from "@/api/trajetos";
import taxasAntecipadasApi from "@/api/taxasAntecipadas";
import despesasDiariasApi from "@/api/despesasDiarias";
import fechamentosApi from "@/api/fechamentos";
import calculosAlimentacaoApi from "@/api/calculosAlimentacao";
import aprovacoesApi from "@/api/aprovacoes";
import comprovantesApi, { extractChaveAcesso } from "@/api/comprovantes";
import notificacoesApi from "@/api/notificacoes";
import { listProfilesByRole } from "@/api/profiles";
import { ensureComprovantesBucket, uploadComprovante, validateFile } from "@/api/storage";

const statusMap = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  em_andamento: { label: 'Em andamento', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  pendente_fechamento: { label: 'Pendente', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  aguardando_gestor: { label: 'Aguardando Gestor', color: 'bg-violet-400/10 text-violet-400 border-violet-400/20' },
  aguardando_financeiro: { label: 'Aguardando Financeiro', color: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' },
  aprovada: { label: 'Aprovada', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

const CATEGORIAS_DESPESA = [
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'combustivel', label: 'Combustível' },
  { id: 'estacionamento', label: 'Estacionamento' },
  { id: 'taxi_uber_km', label: 'Taxi/Uber/KM' },
  { id: 'outros', label: 'Outros' },
];

export default function ViagemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, profile: _profile } = useAuth();
  const [viagem, setViagem] = useState(null);
  const [trajetos, setTrajetos] = useState([]);
  const [taxas, setTaxas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [fechamento, setFechamento] = useState(null);
  const [calculoAlim, setCalculoAlim] = useState(null);
  const [aprovacoes, setAprovacoes] = useState([]);
  const [comprovantes, setComprovantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('despesas');
  const [enviando, setEnviando] = useState(false);
  const [_rejeitarOpen, setRejeitarOpen] = useState(false);
  const [comentario, setComentario] = useState('');

  // Nova despesa
  const [novaDespesa, setNovaDespesa] = useState({
    data: '', alimentacao: '', combustivel: '', estacionamento: '',
    taxi_uber_km: '', outros: '', qtd_colaboradores: 1,
  });

  const loadData = useCallback(async () => {
    const [v, t, tax, desp, fech, calc, apr, comp] = await Promise.all([
      viagensApi.filter({ id }, { limit: 1 }),
      trajetosApi.filter({ viagem_id: id }, { orderBy: "ordem" }),
      taxasAntecipadasApi.filter({ viagem_id: id }),
      despesasDiariasApi.filter({ viagem_id: id }, { orderBy: "data" }),
      fechamentosApi.filter({ viagem_id: id }),
      calculosAlimentacaoApi.filter({ viagem_id: id }),
      aprovacoesApi.filter({ viagem_id: id }, { orderBy: "-created_at" }),
      comprovantesApi.filter({ viagem_id: id }, { orderBy: "-created_at" }),
    ]);
    setViagem(v[0] || null);
    setTrajetos(t);
    setTaxas(tax);
    setDespesas(desp);
    setFechamento(fech[0] || null);
    setCalculoAlim(calc[0] || null);
    setAprovacoes(apr);
    setComprovantes(comp);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const addDespesa = async () => {
    if (!novaDespesa.data) return;
    const total = ['alimentacao', 'combustivel', 'estacionamento', 'taxi_uber_km', 'outros']
      .reduce((s, k) => s + (parseFloat(novaDespesa[k]) || 0), 0);
    if (total === 0) return;

    await despesasDiariasApi.create({
      viagem_id: id,
      data: novaDespesa.data,
      alimentacao: parseFloat(novaDespesa.alimentacao) || 0,
      combustivel: parseFloat(novaDespesa.combustivel) || 0,
      estacionamento: parseFloat(novaDespesa.estacionamento) || 0,
      taxi_uber_km: parseFloat(novaDespesa.taxi_uber_km) || 0,
      outros: parseFloat(novaDespesa.outros) || 0,
      qtd_colaboradores: novaDespesa.qtd_colaboradores,
    });
    setNovaDespesa({ data: '', alimentacao: '', combustivel: '', estacionamento: '', taxi_uber_km: '', outros: '', qtd_colaboradores: 1 });
    await loadData();
  };

  const removeDespesa = async (despId) => {
    await despesasDiariasApi.remove(despId);
    await loadData();
  };

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [processingQr, setProcessingQr] = useState(false);

  const handleUploadComprovante = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !viagem) return;

    // Reset file input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setUploading(true);
    try {
      // Check bucket (optional, don't block upload)
      await ensureComprovantesBucket();
      
      const uploaded = await uploadComprovante({ file, viagemId: id });
      
      // Try to extract value from filename as basic OCR (we'll add real OCR later)
      const fileNameText = file.name;
      
      // Prepare data - only include columns that exist
      const comprovanteData = {
        viagem_id: id,
        file_url: uploaded.publicUrl,
        tipo: 'Comprovante',
        nome_estabelecimento: file.name, // Use existing column
        ocr_status: 'pendente',
      };
      
      // Try to add optional columns (will fail gracefully if they don't exist)
      try {
        await comprovantesApi.createWithOCR(
          {
            ...comprovanteData,
            file_path: uploaded.path,
            file_name: file.name,
            file_type: uploaded.fileType,
            file_size: file.size,
          },
          fileNameText
        );
      } catch (columnErr) {
        // If new columns don't exist, fall back to just basic data
        console.debug('Falling back to basic comprovante data (new columns not found)');
        await comprovantesApi.createWithOCR(comprovanteData, fileNameText);
      }
      
      toast.success('Comprovante carregado com sucesso!');
      await loadData();
    } catch (err) {
      console.error('Erro no upload:', err);
      let errorMessage = 'Erro ao fazer upload do comprovante';
      
      if (err.message) {
        if (err.message.includes('Bucket not found')) {
          errorMessage = "Bucket 'comprovantes' não encontrado. Execute o script SQL no Supabase.";
        } else if (err.message.includes('Unauthorized') || err.message.includes('row-level security policy')) {
          errorMessage = 'Permissão negada. Verifique as políticas RLS no Supabase.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteComprovante = async (comprovante) => {
    if (!confirm('Tem certeza que deseja excluir este comprovante?')) return;
    
    try {
      await comprovantesApi.removeWithFile(comprovante.id, comprovante.file_path);
      toast.success('Comprovante removido com sucesso!');
      await loadData();
    } catch (err) {
      console.error('Erro ao remover:', err);
      toast.error('Erro ao remover comprovante');
    }
  };

  const handleSubmitQrCode = async () => {
    if (!qrCodeUrl.trim() || !viagem) return;
    
    setProcessingQr(true);
    
    try {
      // Check if we can extract a valid chave de acesso
      const chave = extractChaveAcesso(qrCodeUrl);
      
      if (!chave) {
        toast.error('URL ou chave de acesso inválida. Deve conter 44 dígitos.');
        return;
      }
      
      // Create comprovante with the QR code info
      const comprovanteData = {
        viagem_id: viagem.id,
        tipo: 'NFC-e',
        nome_estabelecimento: 'NFC-e',
        qr_code_url: qrCodeUrl,
        chave_acesso: chave,
      };
      
      await comprovantesApi.createWithOCR(comprovanteData, qrCodeUrl);
      
      toast.success('NFC-e adicionada! Processando...');
      setQrCodeUrl('');
      await loadData();
    } catch (err) {
      console.error('Erro ao adicionar NFC-e:', err);
      toast.error('Erro ao adicionar NFC-e');
    } finally {
      setProcessingQr(false);
    }
  };

  const handleEditValor = async (comprovante, novoValor) => {
    try {
      await comprovantesApi.update(comprovante.id, {
        valor_total: parseFloat(novoValor) || null,
        ocr_status: 'concluido',
      });
      toast.success('Valor atualizado!');
      await loadData();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      toast.error('Erro ao atualizar valor');
    }
  };

  const calcularFechamento = async () => {
    const subtotalTaxas = taxas.reduce((s, t) => s + (t.valor || 0), 0);
    const subtotalDespesas = despesas.reduce((s, d) =>
      s + (d.alimentacao || 0) + (d.combustivel || 0) + (d.estacionamento || 0) + (d.taxi_uber_km || 0) + (d.outros || 0), 0);

    const totalGeral = subtotalTaxas + subtotalDespesas;
    const viAdiantamento = viagem?.vi_adiantamento || 0;
    const dif = viAdiantamento - totalGeral;

    // Atualizar cálculo de alimentação
    const ttAlimentacao = despesas.reduce((s, d) => s + (d.alimentacao || 0), 0);
    const viAlimDiaria = calculoAlim?.vi_alimentacao || 360;
    let dias = 1;
    try {
      if (viagem?.dt_saida && viagem?.dt_retorno) {
        const dataSaida = new Date(viagem.dt_saida + 'T00:00:00');
        const dataRetorno = new Date(viagem.dt_retorno + 'T00:00:00');
        if (!isNaN(dataSaida.getTime()) && !isNaN(dataRetorno.getTime())) {
          dias = Math.max(1, Math.ceil((dataRetorno - dataSaida) / (1000 * 60 * 60 * 24)) + 1);
        }
      }
    } catch {
      dias = 1;
    }
    const viTotal = viAlimDiaria * dias;
    const difAlim = viTotal - ttAlimentacao;
    const descontoAplicado = difAlim < 0;
    const valorDescontado = descontoAplicado ? Math.abs(difAlim) : 0;

    if (calculoAlim) {
      await calculosAlimentacaoApi.update(calculoAlim.id, {
        tt_alimentacao: ttAlimentacao,
        dias_viagem: dias,
        vi_total: viTotal,
        dif_alimentacao: difAlim,
        desconto_aplicado: descontoAplicado,
        valor_descontado: valorDescontado,
      });
    }

    if (fechamento) {
      await fechamentosApi.update(fechamento.id, {
        subtotal_taxas: subtotalTaxas,
        subtotal_despesas: subtotalDespesas,
        total_geral: totalGeral,
        vi_adiantamento: viAdiantamento,
        dif_receber_devolver: dif,
        status: 'calculado',
      });
    }

    await loadData();
  };

  const enviarParaAprovacao = async () => {
    if (!viagem || !fechamento) return;
    setEnviando(true);

    await calcularFechamento();

    // Criar aprovação do gestor
    if (viagem.gestor_id) {
      await aprovacoesApi.create({
        viagem_id: id,
        tipo: 'gestor',
        aprovador_id: viagem.gestor_id,
        aprovador_nome: viagem.gestor_nome,
        status: 'pendente',
      });

      await notificacoesApi.create({
        user_id: viagem.gestor_id,
        tipo: 'aprovacao',
        titulo: 'Prestação de contas para aprovar',
        mensagem: `${viagem.solicitante_nome} enviou a prestação de contas da viagem ${viagem.codigo_documento}.`,
        viagem_id: id,
      });
    }

    await viagensApi.updateStatus(id, 'aguardando_gestor');
    await loadData();
    setEnviando(false);
  };

  const aprovar = async (tipo) => {
    const aprov = aprovacoes.find(a => a.tipo === tipo && a.status === 'pendente');
    if (!aprov || !viagem) return;

    await aprovacoesApi.update(aprov.id, {
      status: 'aprovada',
      comentario: comentario || 'Aprovado',
      data_aprovacao: new Date().toISOString(),
    });

    if (tipo === 'gestor') {
      // Criar aprovação do financeiro
      const financeiros = await listProfilesByRole("financeiro");
      if (financeiros.length > 0) {
        await aprovacoesApi.create({
          viagem_id: id,
          tipo: 'financeiro',
          aprovador_id: financeiros[0].id,
          aprovador_nome: financeiros[0].nome,
          status: 'pendente',
        });
        await notificacoesApi.create({
          user_id: financeiros[0].id,
          tipo: 'aprovacao',
          titulo: 'Prestação de contas para aprovação final',
          mensagem: `Viagem ${viagem.codigo_documento} aprovada pelo gestor. Aguardando aprovação financeira.`,
          viagem_id: id,
        });
      }
      await viagensApi.updateStatus(id, 'aguardando_financeiro');
    } else {
      await viagensApi.updateStatus(id, 'aprovada');
      if (fechamento) {
        await fechamentosApi.update(fechamento.id, { status: 'aprovado_financeiro' });
      }
      // Notificar colaborador
      await notificacoesApi.create({
        user_id: viagem.solicitante_id,
        tipo: 'aprovacao',
        titulo: 'Viagem aprovada!',
        mensagem: `Sua prestação de contas ${viagem.codigo_documento} foi aprovada.`,
        viagem_id: id,
      });
    }
    setComentario('');
    await loadData();
  };

  const rejeitar = async (tipo) => {
    const aprov = aprovacoes.find(a => a.tipo === tipo && a.status === 'pendente');
    if (!aprov || !viagem) return;

    await aprovacoesApi.update(aprov.id, {
      status: 'rejeitada',
      comentario: comentario || 'Rejeitado',
      data_aprovacao: new Date().toISOString(),
    });

    await viagensApi.updateStatus(id, 'rejeitada');
    if (fechamento) {
      await fechamentosApi.update(fechamento.id, { status: 'rejeitado' });
    }

    await notificacoesApi.create({
      user_id: viagem.solicitante_id,
      tipo: 'rejeicao',
      titulo: 'Prestação de contas rejeitada',
      mensagem: `${tipo === 'gestor' ? 'Gestor' : 'Financeiro'} rejeitou: ${comentario || 'Sem comentários'}. Faça os ajustes e reenvie.`,
      viagem_id: id,
    });

    setComentario('');
    setRejeitarOpen(false);
    await loadData();
  };

  // Checklist
  const checklistItems = [
    { key: 'dados_gerais', label: 'Dados do cliente e viagem', done: !!(viagem?.cliente_nome && viagem?.localidade) },
    { key: 'trajetos', label: 'Cronograma de trajetos', done: trajetos.length > 0 },
    { key: 'taxas', label: 'Taxas antecipadas', done: true },
    { key: 'despesas', label: 'Despesas registradas', done: despesas.length > 0 },
    { key: 'comprovantes', label: 'Comprovantes anexados', done: comprovantes.length > 0 },
    { key: 'fechamento', label: 'Fechamento calculado', done: !!(fechamento?.status !== 'pendente') },
    { key: 'gestor', label: 'Aprovação do gestor', done: aprovacoes.some(a => a.tipo === 'gestor' && a.status === 'aprovada') },
    { key: 'financeiro', label: 'Aprovação do financeiro', done: aprovacoes.some(a => a.tipo === 'financeiro' && a.status === 'aprovada') },
  ];

  const progresso = Math.round((checklistItems.filter(i => i.done).length / checklistItems.length) * 100);

  if (loading) {
    return (
      <div className="py-6 animate-fade-in space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-700" />
        <Skeleton className="h-64 w-full bg-slate-700 rounded-xl" />
      </div>
    );
  }

  if (!viagem) {
    return (
      <div className="py-12 text-center">
        <Plane className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Viagem não encontrada</p>
        <Link to="/viagens" className="text-primary text-sm hover:underline mt-2 inline-block">Voltar para viagens</Link>
      </div>
    );
  }

  const status = statusMap[viagem.status] || statusMap.rascunho;
  const isColaborador = role === 'colaborador' && viagem.solicitante_id === user?.id;
  const isGestor = role === 'gestor' && viagem.gestor_id === user?.id;
  const isFinanceiro = role === 'financeiro';
  const isAdmin = role === 'admin';
  const canEdit = isColaborador && ['rascunho', 'em_andamento', 'pendente_fechamento', 'rejeitada'].includes(viagem.status);
  const podeAprovarGestor = (isGestor || isAdmin) && viagem.status === 'aguardando_gestor';
  const podeAprovarFinanceiro = (isFinanceiro || isAdmin) && viagem.status === 'aguardando_financeiro';

  return (
    <div className="py-6 animate-fade-in max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ChevronLeft className="h-3 w-3" /> Voltar
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{viagem.codigo_documento}</h1>
              <Badge className={`text-[10px] ${status.color} border`}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {viagem.cliente_nome} — {viagem.localidade}
            </p>
          </div>
          {canEdit && (
            <Button onClick={calcularFechamento} variant="outline" size="sm" className="gap-1.5">
              <Calculator className="h-3.5 w-3.5" /> Recalcular
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Progresso */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Progresso da Viagem</p>
            <span className="text-sm font-bold text-primary">{progresso}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progresso}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {checklistItems.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn(
                  'text-[11px]',
                  item.done ? 'text-muted-foreground line-through' : 'text-muted-foreground'
                )}>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border p-1 rounded-xl w-full justify-start overflow-x-auto">
          <TabsTrigger value="despesas" className="text-xs">Despesas</TabsTrigger>
          <TabsTrigger value="trajetos" className="text-xs">Trajetos</TabsTrigger>
          <TabsTrigger value="taxas" className="text-xs">Taxas</TabsTrigger>
          <TabsTrigger value="comprovantes" className="text-xs">Comprovantes</TabsTrigger>
          <TabsTrigger value="fechamento" className="text-xs">Fechamento</TabsTrigger>
          <TabsTrigger value="aprovacoes" className="text-xs">Aprovações</TabsTrigger>
        </TabsList>

        {/* DESPESAS */}
        <TabsContent value="despesas" className="mt-4 space-y-4">
          {/* Add despesa */}
          {canEdit && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Input
                    type="date"
                    value={novaDespesa.data}
                    onChange={e => setNovaDespesa(prev => ({ ...prev, data: e.target.value }))}
                    className="bg-input border-border w-36 text-sm"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={novaDespesa.qtd_colaboradores}
                    onChange={e => setNovaDespesa(prev => ({ ...prev, qtd_colaboradores: parseInt(e.target.value) || 1 }))}
                    placeholder="Qtd"
                    className="bg-input border-border w-16 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
                  {CATEGORIAS_DESPESA.map(cat => (
                    <div key={cat.id} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{cat.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={novaDespesa[cat.id]}
                        onChange={e => setNovaDespesa(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder="0,00"
                        className="bg-input border-border text-sm h-9"
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={addDespesa} size="sm" className="gradient-primary text-white gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Registrar Despesa
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tabela de despesas */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Data</th>
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Alimentação</th>
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Combustível</th>
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Estacionam.</th>
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Taxi/Uber</th>
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Outros</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-medium">Total</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
                        Nenhuma despesa registrada ainda
                      </td>
                    </tr>
                  ) : (
                    despesas.map((d) => {
                      const total = (d.alimentacao || 0) + (d.combustivel || 0) + (d.estacionamento || 0) + (d.taxi_uber_km || 0) + (d.outros || 0);
                      return (
                        <tr key={d.id} className="border-b border-border/50 hover:bg-accent/5 transition-colors">
                          <td className="p-3 font-medium">{safeFormatDate(d.data, 'dd/MM', ptBR)}</td>
                          <td className="p-3">R$ {(d.alimentacao || 0).toFixed(2)}</td>
                          <td className="p-3">R$ {(d.combustivel || 0).toFixed(2)}</td>
                          <td className="p-3">R$ {(d.estacionamento || 0).toFixed(2)}</td>
                          <td className="p-3">R$ {(d.taxi_uber_km || 0).toFixed(2)}</td>
                          <td className="p-3">R$ {(d.outros || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">R$ {total.toFixed(2)}</td>
                          <td className="p-3">
                            {canEdit && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => removeDespesa(d.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TRAJETOS */}
        <TabsContent value="trajetos" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              {trajetos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum trajeto registrado</p>
              ) : (
                <div className="space-y-2">
                  {trajetos.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                      <Badge className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/20">{i + 1}º</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {t.local_partida || '?'} <ArrowRight className="inline h-3 w-3 mx-1" /> {t.local_chegada || '?'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {safeFormatDate(t.data_saida, "dd/MM", ptBR)} às {t.hora_saida || '—'}
                          {' '}• {t.meio_locomocao}
                          {t.hora_chegada ? ` • Chegada: ${t.hora_chegada}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAXAS */}
        <TabsContent value="taxas" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              {taxas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma taxa antecipada</p>
              ) : (
                <div className="space-y-2">
                  {taxas.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{t.tipo}</p>
                        {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                      </div>
                      <span className="text-sm font-semibold">R$ {(t.valor || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-border font-semibold">
                    <span>Subtotal</span>
                    <span>R$ {taxas.reduce((s, t) => s + (t.valor || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPROVANTES */}
        <TabsContent value="comprovantes" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-4">
              {canEdit && (
                <div className="space-y-4">
                  {/* NFC-e QR Code Section */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Adicionar NFC-e via QR Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={qrCodeUrl}
                        onChange={(e) => setQrCodeUrl(e.target.value)}
                        placeholder="URL do QR Code ou chave de acesso (44 dígitos)"
                        className="bg-input border-border flex-1"
                      />
                      <Button
                        onClick={handleSubmitQrCode}
                        disabled={processingQr || !qrCodeUrl.trim()}
                        className="gradient-primary text-white"
                      >
                        {processingQr ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <QrCode className="h-4 w-4 mr-1" />
                        )}
                        Adicionar
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Cole o link do QR Code da NFC-e ou a chave de acesso com 44 dígitos
                    </p>
                  </div>
                  
                  {/* File Upload Section */}
                  <div className="pt-2 border-t border-border">
                    <Label className="text-xs font-medium mb-2 block">Upload de Arquivo</Label>
                    <label className="flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-background/30">
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {uploading ? 'Carregando...' : 'Fazer upload de comprovante'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, PNG, JPG até 10MB
                        </p>
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="application/pdf,image/png,image/jpeg,image/jpg" 
                        onChange={handleUploadComprovante} 
                        className="hidden" 
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              )}
              {comprovantes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum comprovante anexado</p>
                  {canEdit && <p className="text-xs text-muted-foreground mt-1">Use o botão acima para adicionar</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {comprovantes.map(c => (
                    <div key={c.id} className="p-4 rounded-xl bg-background/50 border border-border/50">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {c.file_type?.toLowerCase() === 'pdf' ? (
                            <FileType className="h-10 w-10 text-red-400" />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {c.file_name || c.nome_estabelecimento || 'Comprovante'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.file_size ? `${(c.file_size / 1024 / 1024).toFixed(2)}MB` : ''}
                            {c.file_type ? ` • ${c.file_type}` : ''}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Valor</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={c.valor_total || ''}
                                onChange={(e) => handleEditValor(c, e.target.value)}
                                placeholder="0,00"
                                className="h-7 text-xs mt-0.5 bg-input border-border"
                              />
                            </div>
                            <Badge className={`text-[9px] ${
                              c.ocr_status === 'concluido' ? 'bg-emerald-400/10 text-emerald-400' :
                              c.ocr_status === 'processando' ? 'bg-amber-400/10 text-amber-400' :
                              'bg-slate-400/10 text-slate-400'
                            }`}>
                              {c.ocr_status === 'concluido' ? 'OCR OK' : c.ocr_status === 'processando' ? 'Processando...' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="block">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer" download className="block">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                              onClick={() => handleDeleteComprovante(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FECHAMENTO */}
        <TabsContent value="fechamento" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-4">
              {!fechamento || fechamento.status === 'pendente' ? (
                <div className="text-center py-8">
                  <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Fechamento ainda não calculado</p>
                  {canEdit && (
                    <Button onClick={calcularFechamento} className="mt-3 gradient-primary text-white gap-1.5" size="sm">
                      <Calculator className="h-3.5 w-3.5" /> Calcular Fechamento
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">Subtotal Taxas</p>
                      <p className="text-lg font-semibold">R$ {(fechamento.subtotal_taxas || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">Subtotal Despesas</p>
                      <p className="text-lg font-semibold">R$ {(fechamento.subtotal_despesas || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">Total Geral</p>
                      <p className="text-lg font-bold">R$ {(fechamento.total_geral || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">VI Adiantamento</p>
                      <p className="text-lg font-semibold">R$ {(fechamento.vi_adiantamento || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Alimentação */}
                  {calculoAlim && (
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Cálculo de Alimentação</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">VI Alim:</span> R$ {calculoAlim.vi_total?.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">TT Alim:</span> R$ {calculoAlim.tt_alimentacao?.toFixed(2)}</div>
                        <div className={calculoAlim.desconto_aplicado ? 'text-red-400' : 'text-emerald-400'}>
                          <span className="text-muted-foreground">Dif:</span> R$ {calculoAlim.dif_alimentacao?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dif. a receber/devolver */}
                  <div className={cn(
                    'p-4 rounded-xl text-center',
                    (fechamento.dif_receber_devolver || 0) > 0 ? 'bg-emerald-400/5 border border-emerald-400/20' : 'bg-red-400/5 border border-red-400/20'
                  )}>
                    <p className="text-xs text-muted-foreground">
                      {(fechamento.dif_receber_devolver || 0) > 0 ? 'Colaborador deve DEVOLVER' : 'Empresa deve REEMBOLSAR'}
                    </p>
                    <p className={cn(
                      'text-xl font-bold mt-1',
                      (fechamento.dif_receber_devolver || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      R$ {Math.abs(fechamento.dif_receber_devolver || 0).toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* APROVAÇÕES */}
        <TabsContent value="aprovacoes" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              {aprovacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma aprovação registrada</p>
              ) : (
                aprovacoes.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="text-[10px] mb-1">
                          {a.tipo === 'gestor' ? 'Gestor' : 'Financeiro'}
                        </Badge>
                        <p className="text-sm font-medium">{a.aprovador_nome}</p>
                      </div>
                      <Badge className={
                        a.status === 'aprovada' ? 'bg-emerald-400/10 text-emerald-400' :
                        a.status === 'rejeitada' ? 'bg-red-400/10 text-red-400' :
                        'bg-amber-400/10 text-amber-400'
                      }>
                        {a.status === 'aprovada' ? 'Aprovado' : a.status === 'rejeitada' ? 'Rejeitado' : 'Pendente'}
                      </Badge>
                    </div>
                    {a.comentario && <p className="text-xs text-muted-foreground mt-2">{a.comentario}</p>}
                    {a.data_aprovacao && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {safeFormatDate(a.data_aprovacao, "dd/MM/yyyy 'às' HH:mm", ptBR)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações de aprovação */}
      {(podeAprovarGestor || podeAprovarFinanceiro) && (
        <Card className="bg-card border-border border-primary/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">
              {podeAprovarGestor ? 'Aprovação do Gestor' : 'Aprovação Financeira'}
            </p>
            <Textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Adicionar comentário (opcional)..."
              className="bg-input border-border h-16 text-sm"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => aprovar(podeAprovarGestor ? 'gestor' : 'financeiro')}
                className="gradient-primary text-white gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Aprovar
              </Button>
              <Button
                variant="outline"
                onClick={() => rejeitar(podeAprovarGestor ? 'gestor' : 'financeiro')}
                className="border-red-400/30 text-red-400 hover:bg-red-400/5 gap-1.5"
              >
                <Ban className="h-4 w-4" /> Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAB - Finalizar viagem */}
      {canEdit && ['em_andamento', 'pendente_fechamento'].includes(viagem.status) && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
          <Button
            onClick={enviarParaAprovacao}
            disabled={enviando}
            size="lg"
            className="gradient-primary text-white gap-2 shadow-xl shadow-primary/30 rounded-2xl px-5 py-6"
          >
            <Send className="h-5 w-5" />
            <span className="font-semibold">Finalizar minha viagem</span>
          </Button>
        </div>
      )}
    </div>
  );
}
