-- Migration: Workspace database triggers
-- Description: Automatic triggers for workspace management
-- Created: 2024-12-16

-- ============================================================================
-- 1. AUTO-UPDATE TIMESTAMPS
-- ============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to workspaces table
CREATE TRIGGER workspace_updated_at_trigger
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

-- Apply to workspace_dashboard_configurations
CREATE TRIGGER dashboard_config_updated_at_trigger
    BEFORE UPDATE ON workspace_dashboard_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

-- Apply to workspace_file_structure_templates
CREATE TRIGGER file_structure_template_updated_at_trigger
    BEFORE UPDATE ON workspace_file_structure_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

-- Apply to workspace_business_services_configurations
CREATE TRIGGER business_services_config_updated_at_trigger
    BEFORE UPDATE ON workspace_business_services_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

-- Apply to workspace_templates
CREATE TRIGGER workspace_template_updated_at_trigger
    BEFORE UPDATE ON workspace_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

COMMENT ON FUNCTION update_workspace_updated_at() IS 'Automatically updates updated_at timestamp on record modification';

-- ============================================================================
-- 2. AUTO-DEACTIVATE OLD CONFIGURATIONS
-- ============================================================================

-- Trigger function to deactivate old workspace configurations when new one is activated
CREATE OR REPLACE FUNCTION deactivate_old_workspace_configs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only run if new config is being set to active
    IF NEW.is_active = true THEN
        -- Deactivate all other active configs for this workspace
        UPDATE workspace_configurations
        SET is_active = false
        WHERE workspace_id = NEW.workspace_id
        AND id != NEW.id
        AND is_active = true;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER deactivate_old_configs_trigger
    BEFORE INSERT OR UPDATE ON workspace_configurations
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION deactivate_old_workspace_configs();

COMMENT ON FUNCTION deactivate_old_workspace_configs() IS 'Ensures only one active configuration per workspace by deactivating others';

-- ============================================================================
-- 3. UPDATE LAST_ACCESSED_AT ON WORKSPACE ACCESS
-- ============================================================================

-- Trigger function to track last access time
CREATE OR REPLACE FUNCTION update_last_accessed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update last_accessed_at when invitation is accepted
    IF NEW.invitation_status = 'accepted' AND OLD.invitation_status != 'accepted' THEN
        NEW.accepted_at = NOW();
        NEW.last_accessed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER update_access_timestamp_trigger
    BEFORE UPDATE ON workspace_access_control
    FOR EACH ROW
    EXECUTE FUNCTION update_last_accessed_at();

COMMENT ON FUNCTION update_last_accessed_at() IS 'Updates accepted_at and last_accessed_at timestamps on invitation acceptance';

-- ============================================================================
-- 4. PREVENT OWNER ROLE DELETION
-- ============================================================================

-- Trigger function to prevent deletion of owner access
CREATE OR REPLACE FUNCTION prevent_owner_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.access_role = 'owner' THEN
        RAISE EXCEPTION 'Cannot delete owner access. Transfer ownership first or delete the workspace.';
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_owner_deletion_trigger
    BEFORE DELETE ON workspace_access_control
    FOR EACH ROW
    WHEN (OLD.access_role = 'owner')
    EXECUTE FUNCTION prevent_owner_deletion();

COMMENT ON FUNCTION prevent_owner_deletion() IS 'Prevents deletion of owner access control records';

-- ============================================================================
-- 5. AUDIT LOG TRIGGERS
-- ============================================================================

-- Trigger function to create audit logs for workspace changes
CREATE OR REPLACE FUNCTION log_workspace_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stakeholder_id UUID;
    v_event_type TEXT;
    v_metadata JSONB;
BEGIN
    -- Get current stakeholder ID
    v_stakeholder_id := get_current_stakeholder_id();

    -- Determine event type based on operation
    IF TG_OP = 'INSERT' THEN
        v_event_type := 'workspace_created';
        v_metadata := jsonb_build_object(
            'workspace_id', NEW.id,
            'workspace_name', NEW.name,
            'reference', NEW.reference
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
            v_event_type := 'workspace_archived';
        ELSIF NEW.status = 'active' AND OLD.status = 'archived' THEN
            v_event_type := 'workspace_restored';
        ELSE
            v_event_type := 'workspace_updated';
        END IF;

        v_metadata := jsonb_build_object(
            'workspace_id', NEW.id,
            'workspace_name', NEW.name,
            'reference', NEW.reference,
            'old_status', OLD.status,
            'new_status', NEW.status
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_event_type := 'workspace_deleted';
        v_metadata := jsonb_build_object(
            'workspace_id', OLD.id,
            'workspace_name', OLD.name,
            'reference', OLD.reference
        );
    END IF;

    -- Insert audit log (for INSERT and UPDATE, use NEW; for DELETE, use OLD)
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            action,
            stakeholder_id,
            workspace_id,
            details,
            created_at
        ) VALUES (
            v_event_type,
            v_stakeholder_id,
            OLD.id,
            v_metadata,
            NOW()
        );
        RETURN OLD;
    ELSE
        INSERT INTO audit_logs (
            action,
            stakeholder_id,
            workspace_id,
            details,
            created_at
        ) VALUES (
            v_event_type,
            v_stakeholder_id,
            NEW.id,
            v_metadata,
            NOW()
        );
        RETURN NEW;
    END IF;
END;
$$;

-- Note: We don't apply this trigger since audit logging is handled in provision_workspace function
-- But it's available for manual audit logging if needed
COMMENT ON FUNCTION log_workspace_changes() IS 'Creates audit log entries for workspace changes (available but not auto-triggered)';

-- ============================================================================
-- 6. ACCESS CONTROL AUDIT TRIGGERS
-- ============================================================================

-- Trigger function to log access control changes
CREATE OR REPLACE FUNCTION log_access_control_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stakeholder_id UUID;
    v_event_type TEXT;
    v_metadata JSONB;
BEGIN
    v_stakeholder_id := get_current_stakeholder_id();

    IF TG_OP = 'INSERT' THEN
        v_event_type := 'access_granted';
        v_metadata := jsonb_build_object(
            'stakeholder_id', NEW.stakeholder_id,
            'access_role', NEW.access_role,
            'invited_by', NEW.invited_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.invitation_status = 'accepted' AND OLD.invitation_status != 'accepted' THEN
            v_event_type := 'collaborator_accepted';
        ELSIF NEW.invitation_status = 'declined' AND OLD.invitation_status != 'declined' THEN
            v_event_type := 'collaborator_declined';
        ELSIF NEW.invitation_status = 'revoked' AND OLD.invitation_status != 'revoked' THEN
            v_event_type := 'access_revoked';
        ELSE
            v_event_type := 'access_updated';
        END IF;

        v_metadata := jsonb_build_object(
            'stakeholder_id', NEW.stakeholder_id,
            'access_role', NEW.access_role,
            'old_status', OLD.invitation_status,
            'new_status', NEW.invitation_status
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_event_type := 'access_revoked';
        v_metadata := jsonb_build_object(
            'stakeholder_id', OLD.stakeholder_id,
            'access_role', OLD.access_role
        );
    END IF;

    -- Insert audit log
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            action,
            stakeholder_id,
            workspace_id,
            details,
            created_at
        ) VALUES (
            v_event_type,
            v_stakeholder_id,
            OLD.workspace_id,
            v_metadata,
            NOW()
        );
        RETURN OLD;
    ELSE
        INSERT INTO audit_logs (
            action,
            stakeholder_id,
            workspace_id,
            details,
            created_at
        ) VALUES (
            v_event_type,
            v_stakeholder_id,
            NEW.workspace_id,
            v_metadata,
            NOW()
        );
        RETURN NEW;
    END IF;
END;
$$;

CREATE TRIGGER log_access_control_trigger
    AFTER INSERT OR UPDATE OR DELETE ON workspace_access_control
    FOR EACH ROW
    EXECUTE FUNCTION log_access_control_changes();

COMMENT ON FUNCTION log_access_control_changes() IS 'Automatically logs all access control changes to audit_logs';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_workspace_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_old_workspace_configs() TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_accessed_at() TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_owner_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION log_workspace_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION log_access_control_changes() TO authenticated;
