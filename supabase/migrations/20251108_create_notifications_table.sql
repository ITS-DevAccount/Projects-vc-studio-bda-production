-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  notification_type text, -- 'welcome', 'workflow', 'file_shared', etc.
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  app_uuid uuid REFERENCES applications(uuid)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users see only their notifications
CREATE POLICY notifications_owner_access ON notifications
  FOR SELECT USING (stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY notifications_owner_update ON notifications
  FOR UPDATE USING (stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_notifications_stakeholder ON notifications(stakeholder_id);
CREATE INDEX idx_notifications_unread ON notifications(stakeholder_id, is_read) WHERE is_read = false;
