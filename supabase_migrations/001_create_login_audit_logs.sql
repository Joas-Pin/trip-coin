
-- Create login_audit_logs table
CREATE TABLE IF NOT EXISTS login_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    login_input TEXT NOT NULL,
    login_type TEXT NOT NULL CHECK (login_type IN ('password', 'mfa', 'google', 'github')),
    success BOOLEAN NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_user_id ON login_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_created_at ON login_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_login_input ON login_audit_logs(login_input);

-- Enable Row Level Security (RLS)
ALTER TABLE login_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to only view their own logs
CREATE POLICY "Users can view their own login logs" ON login_audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy for service role to insert logs
-- Note: In production, you should use a backend service to insert logs
-- For this example, we'll allow authenticated users to insert (in real app, use service role)
CREATE POLICY "Authenticated users can insert their own logs" ON login_audit_logs
    FOR INSERT
    WITH CHECK (true); -- Adjust as needed for your security requirements
