-- Create nodes table for file system
CREATE TABLE IF NOT EXISTS nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'folder')),
  parent_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  file_storage_path text, -- Only for type='file', references Supabase Storage path
  size_bytes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  app_uuid uuid NOT NULL REFERENCES applications(uuid),
  CONSTRAINT unique_name_in_folder UNIQUE(parent_id, name, owner_id) -- Prevent duplicate names in same folder
);

-- Enable RLS
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own nodes
CREATE POLICY nodes_owner_access ON nodes
  FOR SELECT USING (owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- RLS Policy: Users can insert their own nodes
CREATE POLICY nodes_owner_insert ON nodes
  FOR INSERT WITH CHECK (owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- RLS Policy: Users can update their own nodes
CREATE POLICY nodes_owner_update ON nodes
  FOR UPDATE USING (owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- RLS Policy: Users can delete their own nodes
CREATE POLICY nodes_owner_delete ON nodes
  FOR DELETE USING (owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_nodes_owner ON nodes(owner_id);
CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_nodes_app ON nodes(app_uuid);
