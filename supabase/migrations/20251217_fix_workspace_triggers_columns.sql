-- Fix workspace trigger functions to use correct audit_logs column names
-- The audit_logs table uses 'action' and 'details', not 'event_type' and 'metadata'

-- Drop triggers first before dropping functions
DROP TRIGGER IF EXISTS log_access_control_trigger ON workspace_access_control;

-- Drop and recreate log_workspace_changes function with correct columns
DROP FUNCTION IF EXISTS log_workspace_changes();

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

    -- Insert audit log (FIXED: using 'action' and 'details' instead of 'event_type' and 'metadata')
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

COMMENT ON FUNCTION log_workspace_changes() IS 'Creates audit log entries for workspace changes (available but not auto-triggered)';

-- Now drop and recreate log_access_control_changes function with correct columns
DROP FUNCTION IF EXISTS log_access_control_changes();

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

    -- Insert audit log (FIXED: using 'action' and 'details' instead of 'event_type' and 'metadata')
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

-- Recreate trigger
CREATE TRIGGER log_access_control_trigger
    AFTER INSERT OR UPDATE OR DELETE ON workspace_access_control
    FOR EACH ROW
    EXECUTE FUNCTION log_access_control_changes();

COMMENT ON FUNCTION log_access_control_changes() IS 'Automatically logs all access control changes to audit_logs';

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_workspace_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION log_access_control_changes() TO authenticated;
