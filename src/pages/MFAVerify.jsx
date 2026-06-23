
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '@/components/AuthLayout';
import { supabase } from '@/lib/supabase';

export default function MFAVerify() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    checkMFA();
  }, []);

  async function checkMFA() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Check if user needs MFA
      const { data: { factors } } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors.totp?.filter(f => f.status === 'verified') || [];

      if (verifiedFactors.length === 0) {
        navigate('/');
        return;
      }

      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactors[0].id,
      });
      if (challengeError) throw challengeError;
      setChallenge(challengeData);
    } catch (err) {
      console.error(err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!challenge) return;
    setVerifying(true);
    try {
      const { data: _data, error } = await supabase.auth.mfa.verify({
        factorId: challenge.factor_id,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
      toast.success('Autenticado com sucesso!');
      navigate('/');
    } catch (err) {
      toast.error('Código incorreto, tente novamente');
      console.error(err);
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <AuthLayout icon={ShieldCheck} title="Verificando..." subtitle="Aguarde um momento">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Verificação em Dois Passos"
      subtitle="Digite o código do seu aplicativo autenticador"
      footer={
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
          Sair
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código de 6 dígitos</Label>
          <Input
            id="code"
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-widest font-mono"
            autoFocus
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || code.length < 6}
          className="w-full gradient-primary text-white gap-2"
        >
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {verifying ? 'Verificando...' : 'Verificar'}
        </Button>
      </div>
    </AuthLayout>
  );
}
