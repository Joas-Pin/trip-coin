
-- MIGRAÇÃO 006: FUNÇÕES DE SANITIZAÇÃO E VALIDAÇÃO NO POSTGRESQL
-- Execute este script no Editor SQL do Supabase

-- =============================================
-- 1. FUNÇÕES DE DETECÇÃO DE SQL INJECTION
-- =============================================

CREATE OR REPLACE FUNCTION public.detect_sql_injection(input_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica padrões comuns de SQL injection
    RETURN input_text ~* '(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|TRUNCATE|EXEC|EXECUTE|DECLARE|CAST|CONVERT)\b)|(;\s*--)|(''\s*OR\s*\d+\s*=\s*\d+)|(\bWAITFOR\s+DELAY\b)|(\bSLEEP\s*\()|(\bBENCHMARK\s*\()';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- =============================================
-- 2. FUNÇÕES DE SANITIZAÇÃO
-- =============================================

CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove caracteres perigosos e sanitiza
    RETURN regexp_replace(
        regexp_replace(
            trim(input_text),
            E'[\\x00-\\x1F\\x7F]', '', 'g' -- Remove caracteres de controle
        ),
        E'[<>"''`/]', '', 'g' -- Remove caracteres HTML perigosos
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- =============================================
-- 3. FUNÇÕES DE VALIDAÇÃO
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Valida telefone brasileiro básico
    RETURN phone ~* '^(\+?55)?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- =============================================
-- 4. FUNÇÕES DE SEGURANÇA PARA OPERAÇÕES
-- =============================================

-- Função segura para inserir perfil (com validação)
CREATE OR REPLACE FUNCTION public.create_profile_safe(
    p_user_id UUID,
    p_email TEXT,
    p_nome TEXT,
    p_role TEXT DEFAULT 'user',
    p_departamento TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Valida inputs
    IF detect_sql_injection(p_email) OR detect_sql_injection(p_nome) OR detect_sql_injection(p_role) THEN
        RAISE EXCEPTION 'Potencial SQL injection detectado';
    END IF;
    
    IF NOT validate_email(p_email) THEN
        RAISE EXCEPTION 'E-mail inválido';
    END IF;
    
    -- Insere perfil sanitizado
    INSERT INTO public.profiles (id, email, nome, role, departamento)
    VALUES (
        p_user_id,
        sanitize_text(p_email),
        sanitize_text(p_nome),
        sanitize_text(p_role),
        sanitize_text(p_departamento)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função segura para criar viagem
CREATE OR REPLACE FUNCTION public.create_viagem_safe(
    p_codigo_documento TEXT,
    p_solicitante_id UUID,
    p_solicitante_nome TEXT,
    p_departamento TEXT,
    p_dt_saida DATE,
    p_dt_retorno DATE,
    p_cliente_id UUID,
    p_cliente_nome TEXT,
    p_localidade TEXT,
    p_motivo TEXT,
    p_gestor_id UUID,
    p_gestor_nome TEXT,
    p_qtd_colaboradores INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    v_viagem_id UUID;
BEGIN
    -- Validação de SQL injection
    IF detect_sql_injection(p_codigo_documento) OR 
       detect_sql_injection(p_solicitante_nome) OR
       detect_sql_injection(p_departamento) OR
       detect_sql_injection(p_cliente_nome) OR
       detect_sql_injection(p_localidade) OR
       detect_sql_injection(p_motivo) OR
       detect_sql_injection(p_gestor_nome) THEN
        RAISE EXCEPTION 'Potencial SQL injection detectado';
    END IF;
    
    -- Validação de datas
    IF p_dt_saida > p_dt_retorno THEN
        RAISE EXCEPTION 'Data de saída não pode ser posterior à data de retorno';
    END IF;
    
    -- Insere viagem com dados sanitizados
    INSERT INTO public.viagens (
        codigo_documento,
        revisao,
        emissao,
        ultima_revisao,
        num_pag,
        solicitante_id,
        solicitante_nome,
        depto,
        dt_saida,
        dt_retorno,
        cliente_id,
        cliente_nome,
        localidade,
        motivo,
        gestor_id,
        gestor_nome,
        qtd_colaboradores,
        status
    ) VALUES (
        sanitize_text(p_codigo_documento),
        '01',
        CURRENT_DATE,
        CURRENT_DATE,
        1,
        p_solicitante_id,
        sanitize_text(p_solicitante_nome),
        sanitize_text(p_departamento),
        p_dt_saida,
        p_dt_retorno,
        p_cliente_id,
        sanitize_text(p_cliente_nome),
        sanitize_text(p_localidade),
        sanitize_text(p_motivo),
        p_gestor_id,
        sanitize_text(p_gestor_nome),
        p_qtd_colaboradores,
        'em_andamento'
    ) RETURNING id INTO v_viagem_id;
    
    RETURN v_viagem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. TRIGGERS DE SANITIZAÇÃO AUTOMÁTICA
-- =============================================

-- Trigger para sanitizar dados na tabela profiles antes de inserir/atualizar
CREATE OR REPLACE FUNCTION public.sanitize_profile_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email := sanitize_text(NEW.email);
    NEW.nome := sanitize_text(NEW.nome);
    NEW.role := sanitize_text(NEW.role);
    NEW.username := sanitize_text(NEW.username);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sanitize_profile_trigger ON profiles;

CREATE TRIGGER sanitize_profile_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION sanitize_profile_trigger();

-- Trigger similar para clientes
CREATE OR REPLACE FUNCTION public.sanitize_cliente_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nome := sanitize_text(NEW.nome);
    NEW.cidade := sanitize_text(NEW.cidade);
    NEW.uf := sanitize_text(NEW.uf);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sanitize_cliente_trigger ON clientes;

CREATE TRIGGER sanitize_cliente_trigger
BEFORE INSERT OR UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION sanitize_cliente_trigger();

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

