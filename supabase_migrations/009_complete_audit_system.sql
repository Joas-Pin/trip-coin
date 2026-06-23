
-- MIGRAÇÃO 009: SISTEMA COMPLETO DE AUDITORIA
-- Execute este script no Editor SQL do Supabase

-- =============================================
-- 1. CRIAR TABELA PRINCIPAL DE AUDITORIA
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    old_values JSONB,
    new_values JSONB,
    record_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_logs(table_name, record_id);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs: Somente admins podem ver" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- =============================================
-- 2. FUNÇÃO GENÉRICA DE LOG DE AUDITORIA
-- =============================================

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_record_id TEXT;
BEGIN
    -- Obter valores antigos e novos
    IF TG_OP = 'INSERT' THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    END IF;
    
    -- Obter ID do registro (tenta encontrar coluna 'id' primeiro)
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_record_id := COALESCE(NEW.id::TEXT, NULL);
    ELSE
        v_record_id := COALESCE(OLD.id::TEXT, NULL);
    END IF;
    
    -- Inserir log
    INSERT INTO public.audit_logs (
        table_name,
        action,
        old_values,
        new_values,
        record_id,
        user_id,
        user_email,
        user_role,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        v_old_values,
        v_new_values,
        v_record_id,
        auth.uid(),
        auth.email(),
        public.get_current_user_role(),
        inet_client_addr()::TEXT
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. APLICAR TRIGGERS DE AUDITORIA EM TABELAS IMPORTANTES
-- =============================================

-- Tabela Viagens
DROP TRIGGER IF EXISTS audit_viagens_trigger ON viagens;
CREATE TRIGGER audit_viagens_trigger
AFTER INSERT OR UPDATE OR DELETE ON viagens
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Tabela Profiles
DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Tabela Clientes
DROP TRIGGER IF EXISTS audit_clientes_trigger ON clientes;
CREATE TRIGGER audit_clientes_trigger
AFTER INSERT OR UPDATE OR DELETE ON clientes
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Tabela Departamentos
DROP TRIGGER IF EXISTS audit_departamentos_trigger ON departamentos;
CREATE TRIGGER audit_departamentos_trigger
AFTER INSERT OR UPDATE OR DELETE ON departamentos
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- =============================================
-- 4. FUNÇÕES AUXILIARES PARA CONSULTA DE AUDITORIA
-- =============================================

-- Obter logs para uma tabela específica
CREATE OR REPLACE FUNCTION public.get_audit_logs(
    p_table_name TEXT,
    p_limit INTEGER DEFAULT 100
)
RETURNS SETOF audit_logs AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM audit_logs
    WHERE table_name = p_table_name
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obter logs para um usuário específico
CREATE OR REPLACE FUNCTION public.get_user_audit_logs(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS SETOF audit_logs AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM audit_logs
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. LIMPAR LOGS ANTIGOS (manutenção)
-- =============================================

CREATE OR REPLACE FUNCTION public.clean_old_audit_logs(p_days_old INTEGER DEFAULT 90)
RETURNS VOID AS $$
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

