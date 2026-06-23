import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, User, Loader2, ShieldCheck, QrCode, Copy, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ensureProfileForUser } from "@/api/profiles";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email-password');
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA State
  const [factor, setFactor] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um e-mail válido");
      return;
    }
    
    // Username is optional for now
    // if (!username || username.length < 3) {
    //   setError("Nome de usuário deve ter pelo menos 3 caracteres");
    //   return;
    // }
    
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setLoading(true);
    try {
      console.log("[Auth] Iniciando cadastro para:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username }
        },
      });

      if (error) {
        console.error("[Auth] Erro no cadastro:", error);
        throw error;
      }

      console.log("[Auth] Cadastro bem-sucedido:", data);
      
      // Create profile with username (will try to use username column, fallback to without)
      if (data.user) {
        await ensureProfileForUser(data.user, undefined, username);
      }
      
      // Move to MFA setup step
      setStep('mfa-setup');
      
      // Start MFA enrollment automatically
      await startMfaEnrollment();
      
    } catch (err) {
      console.error("[Auth] Falha no cadastro:", err);
      
      let errorMessage = "Ocorreu um erro no cadastro";
      if (err.message.includes("email")) {
        errorMessage = "E-mail já cadastrado ou inválido";
      } else if (err.message.includes("password")) {
        errorMessage = "Senha muito fraca";
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startMfaEnrollment = async () => {
    setEnrolling(true);
    try {
      console.log('[Register] Starting MFA enrollment...');
      // First check if user already has factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData.totp?.filter(f => f.status === 'verified') || [];
      
      if (verifiedFactors.length > 0) {
        // User already has 2FA, skip setup
        setStep('complete');
        setTimeout(() => {
          navigate("/");
        }, 1500);
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Fechamento de Viagem',
        friendlyName: `Meu App ${Date.now()}`, // Add timestamp to avoid conflict
      });
      if (error) throw error;
      
      console.log('[Register] Enroll response:', data);
      
      // Access factor correctly - Supabase returns data directly or nested?
      const factorData = data.factor || data;
      setFactor(factorData);
      
      // Get QR code from data.totp.qr_code or directly from data
      const qrCodeValue = data.totp?.qr_code || data.qr_code;
      setQrCode(qrCodeValue);
      
      console.log('[Register] Factor set:', factorData);
      console.log('[Register] QR code set:', qrCodeValue);
      
    } catch (err) {
      toast.error('Erro ao iniciar configuração de 2FA');
      console.error('[Register] Enroll error:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const verifyMfaEnrollment = async () => {
    if (!factor) return;
    setVerifying(true);
    try {
      console.log('[Register] Verifying enrollment with factor ID:', factor.id);
      
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (error) throw error;

      console.log('[Register] Challenge response:', data);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: data.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      console.log('[Register] Verify successful!');

      toast.success('2FA configurado com sucesso!');
      setStep('complete');
      
      setTimeout(() => {
        navigate("/");
      }, 1500);
      
    } catch (err) {
      toast.error('Código incorreto, tente novamente');
      console.error('[Register] Verify error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  const resetFlow = () => {
    setStep('email-password');
    setFactor(null);
    setQrCode("");
    setVerifyCode("");
    setError("");
  };

  if (step === 'mfa-setup') {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title="Configurar 2FA"
        subtitle="Adicione segurança extra à sua conta"
        footer={
          <Button variant="ghost" size="sm" onClick={resetFlow}>
            Voltar
          </Button>
        }
      >
        <div className="space-y-6">
          {!factor ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Use um aplicativo autenticador como Google Authenticator, Microsoft Authenticator ou Authy.
              </p>
              <Button onClick={startMfaEnrollment} disabled={enrolling} className="w-full gap-2">
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                {enrolling ? 'Configurando...' : 'Iniciar Configuração'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code para 2FA" className="w-48 h-48 rounded-lg" />
              </div>

              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <Label className="text-sm mb-2 block">Ou insira manualmente:</Label>
                <div className="flex items-center gap-2">
                  <Input value={factor.secret} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(factor.secret); toast.success('Código copiado!'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Digite o código do aplicativo</Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>

              <Button 
                onClick={verifyMfaEnrollment} 
                disabled={verifying || verifyCode.length < 6} 
                className="w-full gap-2"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {verifying ? 'Verificando...' : 'Verificar e Concluir'}
              </Button>
            </div>
          )}
        </div>
      </AuthLayout>
    );
  }

  if (step === 'complete') {
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="Conta criada com sucesso!"
        subtitle="Redirecionando para o dashboard..."
        footer={
          <Link to="/" className="text-primary font-medium hover:underline">
            Ir para o dashboard
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          Sua conta foi criada e a autenticação em dois passos foi configurada com sucesso!
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Crie sua conta"
      subtitle="Cadastre-se para começar"
      footer={
        <>
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Entrar com Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Nome de Usuário <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="seuusuario"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="pl-10 h-12"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
