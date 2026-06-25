
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Lock, User, Loader2, ShieldCheck, ChevronLeft, AlertCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getProfileByUsername } from "@/api/profiles";

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

export default function Login() {
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("identify"); // identify → password → mfa OR identify → mfa
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaChallengeId, setMfaChallengeId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  
  // Login attempts for rate limiting
  const [loginAttempts, setLoginAttempts] = useState(() => {
    const saved = localStorage.getItem("loginAttempts");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Date.now() - parsed.timestamp < LOCKOUT_TIME_MS) {
        return parsed;
      }
    }
    return { count: 0, timestamp: Date.now() };
  });

  // Save login attempts to localStorage
  useEffect(() => {
    localStorage.setItem("loginAttempts", JSON.stringify(loginAttempts));
  }, [loginAttempts]);

  // Check if locked out
  const isLockedOut = loginAttempts.count >= MAX_LOGIN_ATTEMPTS && 
    Date.now() - loginAttempts.timestamp < LOCKOUT_TIME_MS;

  const getLockoutTimeRemaining = () => {
    if (!isLockedOut) return 0;
    return Math.ceil((LOCKOUT_TIME_MS - (Date.now() - loginAttempts.timestamp)) / 1000 / 60);
  };

  // Reset login attempts on successful login
  const resetLoginAttempts = () => {
    setLoginAttempts({ count: 0, timestamp: Date.now() });
  };

  // Increment login attempts
  const incrementLoginAttempts = () => {
    setLoginAttempts(prev => ({
      count: prev.count + 1,
      timestamp: Date.now()
    }));
  };

  // Log login attempt - skip for now (requires login_audit_logs table)
  const logLoginAttempt = async (type, success, details = {}) => {
    // Optional: Uncomment and create table in Supabase to enable
    // try {
    //   const { data: userData } = await supabase.auth.getUser();
    //   await supabase.from("login_audit_logs").insert({
    //     login_input: loginInput,
    //     login_type: type,
    //     success: success,
    //     user_id: userData.user?.id,
    //     user_agent: navigator.userAgent,
    //     details: details,
    //     created_at: new Date().toISOString(),
    //   });
    // } catch (err) {
    //   // Skip logging errors since it's not critical
    // }
  };

  const [foundEmail, setFoundEmail] = useState("");

  const handleIdentify = async (e) => {
    e.preventDefault();
    if (isLockedOut) {
      setError(`Conta temporariamente bloqueada. Tente novamente em ${getLockoutTimeRemaining()} minutos.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let emailToUse = loginInput;
      let inputIsUsername = !loginInput.includes("@");
      
      // Check if input is username (not email)
      if (inputIsUsername) {
        try {
          const profile = await getProfileByUsername(loginInput.toLowerCase().trim());
          if (profile?.email) {
            emailToUse = profile.email;
            setFoundEmail(profile.email);
          }
        } catch (err) {
          // If username lookup fails for any reason, just use input as email
          console.debug("Username lookup failed, treating as email:", err);
        }
      }

      // Store the email we'll use for login
      setLoginInput(emailToUse);
      setFoundEmail(emailToUse);
      
      // Proceed to password step
      setStep("password");
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (isLockedOut) {
      setError(`Conta temporariamente bloqueada. Tente novamente em ${getLockoutTimeRemaining()} minutos.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use foundEmail from identify step
      let emailToUse = foundEmail || loginInput;
      
      // Double-check username if needed
      if (!emailToUse.includes("@")) {
        try {
          const profile = await getProfileByUsername(emailToUse.toLowerCase().trim());
          if (profile?.email) {
            emailToUse = profile.email;
          }
        } catch (err) {
          // Profile not found, continue
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        incrementLoginAttempts();
        await logLoginAttempt("password", false, { error: error.message });
        setError(error.message);
        return;
      }

      resetLoginAttempts();
      await logLoginAttempt("password", true);

      // Check if MFA is required
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData.totp?.filter(f => f.status === "verified") || [];

      if (verifiedFactors.length > 0) {
        // Need to do MFA
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactors[0].id,
        });

        if (challengeError) throw challengeError;

        setMfaFactorId(verifiedFactors[0].id);
        setMfaChallengeId(challengeData.id);
        setStep("mfa");
      } else {
        // No MFA, go to dashboard
        toast.success("Autenticado com sucesso!");
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || !mfaChallengeId) return;
    if (isLockedOut) {
      setError(`Conta temporariamente bloqueada. Tente novamente em ${getLockoutTimeRemaining()} minutos.`);
      return;
    }

    setVerifyingMfa(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode,
      });
      if (error) {
        incrementLoginAttempts();
        await logLoginAttempt("mfa", false, { error: error.message });
        throw error;
      }

      resetLoginAttempts();
      await logLoginAttempt("mfa", true);
      toast.success("Autenticado com sucesso!");
      navigate("/");
    } catch (err) {
      setError(err.message || "Código incorreto");
    } finally {
      setVerifyingMfa(false);
    }
  };

  const handleGoogle = async () => {
    // Use a URL explícita do env se disponível, senão a origin atual
    const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL || window.location.origin;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  const resetStep = () => {
    setStep("identify");
    setMfaFactorId(null);
    setMfaChallengeId(null);
    setMfaCode("");
    setPassword("");
    setError("");
    setFoundEmail("");
  };

  // MFA Screen
  if (step === "mfa") {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title="Verificação em dois passos"
        subtitle="Digite o código do seu aplicativo autenticador"
        footer={
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" onClick={resetStep} className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setStep("password")} 
              className="text-xs text-primary hover:text-primary/80"
            >
              Logar com senha
            </Button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código de 6 dígitos</Label>
            <Input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerifyMfa}
            disabled={verifyingMfa || mfaCode.length < 6}
            className="w-full gradient-primary text-white gap-2"
          >
            {verifyingMfa ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {verifyingMfa ? "Verificando..." : "Verificar"}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Password Screen
  if (step === "password") {
    return (
      <AuthLayout
        icon={LogIn}
        title="Digite sua senha"
        subtitle={`Olá, ${foundEmail && foundEmail !== loginInput ? loginInput : loginInput}`}
        footer={
          <Button variant="ghost" size="sm" onClick={resetStep} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitPassword} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Esqueci a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                autoFocus
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || isLockedOut}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : isLockedOut ? (
              `Tente novamente em ${getLockoutTimeRemaining()} min`
            ) : (
              "Confirmar"
            )}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  // Identify Screen (default)
  return (
    <AuthLayout
      icon={LogIn}
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta"
      footer={
        <>
          Não tem uma conta?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Criar conta
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
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleIdentify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login">E-mail ou Nome de Usuário</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="login"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com ou seuusuario"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || isLockedOut}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Carregando...
            </>
          ) : isLockedOut ? (
            `Bloqueado (${getLockoutTimeRemaining()} min)`
          ) : (
            "Continuar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
