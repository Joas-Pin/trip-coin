
-- MIGRAÇÃO 007: RATE LIMITING NO POSTGRESQL
-- Execute este script no Editor SQL do Supabase

-- =============================================
-- 1. CRIAR TABELA DE CONTROLE DE RATE LIMIT
-- =============================================

CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- ex: 'create_viagem', 'login', 'upload_file'
    ip_address INET,
    user_agent TEXT,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON rate_limit_logs(user_id, action, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_action ON rate_limit_logs(ip_address, action, window_start DESC);

-- Habilitar RLS
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios logs de rate limit" ON rate_limit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- 2. FUNÇÃO DE RATE LIMITING
-- =============================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INTEGER DEFAULT 15,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Conta requisições na janela atual
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM rate_limit_logs
    WHERE user_id = p_user_id
      AND action = p_action
      AND window_start >= v_window_start;
    
    IF v_current_count >= p_max_requests THEN
        RETURN FALSE; -- Limite excedido
    END IF;
    
    -- Registra a requisição
    INSERT INTO rate_limit_logs (user_id, action, request_count, window_start)
    VALUES (p_user_id, p_action, 1, v_window_start)
    ON CONFLICT (user_id, action, window_start) 
    DO UPDATE SET request_count = rate_limit_logs.request_count + 1;
    
    RETURN TRUE; -- Permitido
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. FUNÇÃO DE RATE LIMIT POR IP (para requests não autenticadas)
-- =============================================

CREATE OR REPLACE FUNCTION public.check_rate_limit_by_ip(
    p_ip_address INET,
    p_action TEXT,
    p_max_requests INTEGER DEFAULT 30,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM rate_limit_logs
    WHERE ip_address = p_ip_address
      AND action = p_action
      AND window_start >= v_window_start;
    
    IF v_current_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO rate_limit_logs (ip_address, action, request_count, window_start)
    VALUES (p_ip_address, p_action, 1, v_window_start)
    ON CONFLICT (ip_address, action, window_start) 
    DO UPDATE SET request_count = rate_limit_logs.request_count + 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. FUNÇÃO WRAPPER PARA USAR EM RPC
-- =============================================

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(p_action TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN check_rate_limit(auth.uid(), p_action, 15, 60);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. LIMPAR LOGS ANTIGOS (manutenção)
-- =============================================

CREATE OR REPLACE FUNCTION public.clean_old_rate_limit_logs()
RETURNS VOID AS $$
BEGIN
    DELETE FROM rate_limit_logs WHERE created_at > NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Opcional) Criar cron job para limpar logs antigos - requer pg_cron
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('clean-rate-limit-logs', '0 0 * * *', 'SELECT public.clean_old_rate_limit_logs();');

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

