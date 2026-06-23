
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, QrCode, Copy, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function MFASetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [factor, setFactor] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factors, setFactors] = useState([]);

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data.totp || []);
    } catch (err) {
      toast.error('Erro ao carregar fatores de autenticação');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function startEnrollment() {
    setEnrolling(true);
    try {
      console.log('[MFASetup] Starting MFA enrollment...');
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Fechamento de Viagem',
        friendlyName: `Trip Coin ${Date.now()}`, // Add timestamp to avoid conflict
      });
      if (error) throw error;
      
      console.log('[MFASetup] Enroll response:', data);
      
      // Access factor correctly - Supabase returns data directly or nested?
      const factorData = data.factor || data;
      setFactor(factorData);
      
      // Get QR code from data.totp.qr_code or directly from data
      const qrCodeValue = data.totp?.qr_code || data.qr_code;
      setQrCode(qrCodeValue);
      
      console.log('[MFASetup] Factor set:', factorData);
      console.log('[MFASetup] QR code set:', qrCodeValue);
      
    } catch (err) {
      toast.error('Erro ao iniciar configuração de 2FA');
      console.error('[MFASetup] Enroll error:', err);
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyEnrollment() {
    if (!factor) return;
    setVerifying(true);
    try {
      console.log('[MFASetup] Verifying enrollment with factor ID:', factor.id);
      
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (error) throw error;

      console.log('[MFASetup] Challenge response:', data);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: data.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      console.log('[MFASetup] Verify successful!');

      toast.success('2FA configurado com sucesso! Redirecionando...');
      await loadFactors();
      setFactor(null);
      setQrCode('');
      setVerifyCode('');
      
      // Redirect to dashboard after successful setup
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err) {
      toast.error('Código incorreto, tente novamente');
      console.error('[MFASetup] Verify error:', err);
    } finally {
      setVerifying(false);
    }
  }

  async function removeFactor(factorId) {
    if (!confirm('Tem certeza que deseja remover este método de autenticação?')) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (error) throw error;
      toast.success('Método removido com sucesso');
      await loadFactors();
    } catch (err) {
      toast.error('Erro ao remover método');
      console.error(err);
    }
  }

  return (
    <div className="py-6 animate-fade-in max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Autenticação em Dois Passos (2FA)</h1>
          <p className="text-sm text-muted-foreground mt-1">Adicione segurança extra à sua conta</p>
        </div>
      </div>

      {loading ? (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {factors.length > 0 ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Métodos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {factors.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border">
                    <div>
                      <p className="font-medium">{f.friendly_name || 'Aplicativo Autenticador'}</p>
                      <p className="text-xs text-muted-foreground">Status: {f.status === 'verified' ? 'Verificado' : 'Pendente'}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeFactor(f.id)}>
                      Remover
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {!factor ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Adicionar 2FA via Aplicativo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use um aplicativo autenticador como Google Authenticator, Microsoft Authenticator ou Authy.
                </p>
                <Button onClick={startEnrollment} disabled={enrolling} className="gradient-primary text-white gap-2">
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  {enrolling ? 'Configurando...' : 'Iniciar Configuração'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">1. Escaneie o QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code para 2FA" className="w-64 h-64 rounded-lg" />
                </div>

                <div className="p-4 rounded-lg bg-background/50 border border-border">
                  <Label className="text-sm mb-2 block">Ou insira manualmente:</Label>
                  <div className="flex items-center gap-2">
                    <Input value={factor.secret} readOnly className="font-mono" />
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(factor.secret); toast.success('Código copiado!'); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">2. Digite o código do aplicativo</Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setFactor(null); setQrCode(''); setVerifyCode(''); }}>
                    Cancelar
                  </Button>
                  <Button onClick={verifyEnrollment} disabled={verifying || verifyCode.length < 6} className="gradient-primary text-white gap-2">
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {verifying ? 'Verificando...' : 'Verificar e Concluir'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
