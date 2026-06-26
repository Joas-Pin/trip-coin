-- MIGRAÇÃO 014: Adiciona colunas para dados completos da NFC-e à tabela comprovantes
-- Execute este script no Editor SQL do Supabase

DO $$ BEGIN
    -- Adiciona coluna data_emissao se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'data_emissao'
    ) THEN
        ALTER TABLE comprovantes ADD COLUMN data_emissao TEXT;
        RAISE NOTICE 'Coluna data_emissao adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna data_emissao já existe na tabela comprovantes';
    END IF;

    -- Adiciona coluna emitente se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'emitente'
    ) THEN
        ALTER TABLE comprovantes ADD COLUMN emitente TEXT;
        RAISE NOTICE 'Coluna emitente adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna emitente já existe na tabela comprovantes';
    END IF;

    -- Adiciona coluna cnpj se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'cnpj'
    ) THEN
        ALTER TABLE comprovantes ADD COLUMN cnpj TEXT;
        RAISE NOTICE 'Coluna cnpj adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna cnpj já existe na tabela comprovantes';
    END IF;

    -- Adiciona coluna nfce_json se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'nfce_json'
    ) THEN
        ALTER TABLE comprovantes ADD COLUMN nfce_json JSONB;
        RAISE NOTICE 'Coluna nfce_json adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna nfce_json já existe na tabela comprovantes';
    END IF;

    -- Adiciona coluna error_message se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE comprovantes ADD COLUMN error_message TEXT;
        RAISE NOTICE 'Coluna error_message adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna error_message já existe na tabela comprovantes';
    END IF;

    -- Adiciona coluna updated_at se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comprovantes' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE comprovantes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada à tabela comprovantes';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe na tabela comprovantes';
    END IF;
END $$;
