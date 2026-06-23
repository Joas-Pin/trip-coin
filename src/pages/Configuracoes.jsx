

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Calculator, DollarSign, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import configuracoesFinanceirasApi from "@/api/configuracoes";

const CONFIG_KEYS = [
  { chave: 'vi_alimentacao_diaria', label: 'VI Alimentação (por diária)', desc: 'Valor limite de alimentação por dia', default: 360 },
  { chave: 'limite_hospedagem', label: 'Limite Hospedagem', desc: 'Valor máximo para hospedagem', default: 500 },
  { chave: 'limite_combustivel', label: 'Limite Combustível', desc: 'Valor máximo para combustível por dia', default: 200 },
  { chave: 'limite_estacionamento', label: 'Limite Estacionamento', desc: 'Valor máximo para estacionamento por dia', default: 50 },
  { chave: 'limite_taxi_uber', label: 'Limite Taxi/Uber/KM', desc: 'Valor máximo para transporte por dia', default: 150 },
  { chave: 'limite_outros', label: 'Limite Outros Custos', desc: 'Valor máximo para outros custos por dia', default: 100 },
];

export default function Configuracoes() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const all = await configuracoesFinanceirasApi.list({ orderBy: "chave" });
    const map = {};
    all.forEach(c => { map[c.chave] = c; });
    setConfigs(map);

    // Preencher valores
    const vals = {};
    CONFIG_KEYS.forEach(k => {
      vals[k.chave] = map[k.chave]?.valor?.toString() || k.default.toString();
    });
    setValues(vals);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const key of CONFIG_KEYS) {
      const existing = configs[key.chave];
      const newVal = parseFloat(values[key.chave]) || key.default;

      if (existing) {
        await configuracoesFinanceirasApi.update(existing.id, { valor: newVal });
      } else {
        await configuracoesFinanceirasApi.create({
          chave: key.chave,
          valor: newVal,
          descricao: key.desc,
        });
      }
    }
    await loadConfigs();
    setSaving(false);
    toast.success('Configurações salvas com sucesso');
  };

  return (
    <div className="py-6 animate-fade-in max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações Financeiras</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina os parâmetros e limites de gastos para viagens</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Limites e Parâmetros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-48 bg-slate-700" />
                <Skeleton className="h-10 w-full bg-slate-700 rounded-lg" />
              </div>
            ))
          ) : (
            CONFIG_KEYS.map(key => (
              <div key={key.chave} className="space-y-1.5">
                <Label className="text-sm flex items-center justify-between">
                  <span>{key.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">{key.desc}</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values[key.chave] || ''}
                    onChange={e => setValues(prev => ({ ...prev, [key.chave]: e.target.value }))}
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>
            ))
          )}

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full gradient-primary text-white gap-1.5 shadow-lg shadow-primary/25"
          >
            {saving ? 'Salvando...' : <><Save className="h-4 w-4" /> Salvar Configurações</>}
          </Button>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Segurança da Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link to="/mfa-setup" className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border hover:bg-background/70 transition-colors">
            <div>
              <p className="font-medium">Autenticação em Dois Passos (2FA)</p>
              <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Resumo das Regras
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>VI Alimentação:</strong> valor limite diário para gastos com alimentação. Se o total gasto ultrapassar o limite, o excedente é descontado do colaborador.</p>
          <p>• <strong>Demais limites:</strong> os valores configurados são usados para alertar sobre possíveis excessos, mas não bloqueiam o registro.</p>
          <p>• <strong>Fechamento:</strong> VI Adiantamento − Total Geral = Diferença. Se positivo, colaborador devolve; se negativo, empresa reembolsa.</p>
        </CardContent>
      </Card>
    </div>
  );
}
