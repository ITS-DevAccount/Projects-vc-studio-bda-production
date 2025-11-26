-- Sprint 1d.7: FLM Building Workflow - File Audit Log
-- Phase B: Workflow Components

-- File Audit Log for tracking admin file access
CREATE TABLE IF NOT EXISTS file_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,

    -- Action
    action TEXT NOT NULL CHECK (action IN ('upload', 'delete', 'view', 'download', 'move', 'rename')),

    -- Actor
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    performed_by_name TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_file_audit_log_stakeholder ON file_audit_log(stakeholder_id);
CREATE INDEX idx_file_audit_log_performed_by ON file_audit_log(performed_by);
CREATE INDEX idx_file_audit_log_action ON file_audit_log(action);
CREATE INDEX idx_file_audit_log_performed_at ON file_audit_log(performed_at DESC);
CREATE INDEX idx_file_audit_log_file_path ON file_audit_log(file_path);

-- RLS Policies
ALTER TABLE file_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY file_audit_log_admin_view ON file_audit_log
    FOR SELECT
    USING (is_user_admin());

-- Stakeholders can view audit logs for their own files
CREATE POLICY file_audit_log_stakeholder_view ON file_audit_log
    FOR SELECT
    USING (
        stakeholder_id IN (
            SELECT stakeholder_id FROM stakeholders
            WHERE user_id = auth.uid()
        )
    );

-- System can insert audit logs
CREATE POLICY file_audit_log_insert ON file_audit_log
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Comments
COMMENT ON TABLE file_audit_log IS 'Sprint 1d.7: Audit trail for all file operations, especially admin access';
COMMENT ON COLUMN file_audit_log.file_path IS 'Full path to the file in the stakeholder file system';
COMMENT ON COLUMN file_audit_log.action IS 'Type of file operation performed';
COMMENT ON COLUMN file_audit_log.metadata IS 'Additional context (file size, category, etc.)';
