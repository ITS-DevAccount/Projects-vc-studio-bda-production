-- Fix recursive RLS policies for nodes/node_shares using SECURITY DEFINER helpers

-- Helper: current stakeholder id (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION current_stakeholder_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM stakeholders WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Helper: can current user access node?
CREATE OR REPLACE FUNCTION can_access_node(p_node_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM nodes n
    WHERE n.id = p_node_id
      AND (
        n.owner_id = current_stakeholder_id()
        OR n.is_shared = true
        OR EXISTS (
          SELECT 1
          FROM node_shares ns
          WHERE ns.node_id = n.id
            AND ns.shared_with_stakeholder_id = current_stakeholder_id()
        )
      )
  );
$$;

-- Replace nodes policies
DROP POLICY IF EXISTS nodes_owner_access ON nodes;
DROP POLICY IF EXISTS nodes_owner_update ON nodes;
DROP POLICY IF EXISTS nodes_owner_delete ON nodes;

CREATE POLICY nodes_access ON nodes
  FOR SELECT
  USING (can_access_node(id));

CREATE POLICY nodes_update ON nodes
  FOR UPDATE
  USING (
    owner_id = current_stakeholder_id()
    OR EXISTS (
      SELECT 1 FROM node_shares ns
      WHERE ns.node_id = nodes.id
        AND ns.shared_with_stakeholder_id = current_stakeholder_id()
        AND ns.permission IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    owner_id = current_stakeholder_id()
    OR EXISTS (
      SELECT 1 FROM node_shares ns
      WHERE ns.node_id = nodes.id
        AND ns.shared_with_stakeholder_id = current_stakeholder_id()
        AND ns.permission IN ('edit', 'admin')
    )
  );

CREATE POLICY nodes_delete ON nodes
  FOR DELETE
  USING (
    owner_id = current_stakeholder_id()
    OR EXISTS (
      SELECT 1 FROM node_shares ns
      WHERE ns.node_id = nodes.id
        AND ns.shared_with_stakeholder_id = current_stakeholder_id()
        AND ns.permission = 'admin'
    )
  );

-- Replace node_shares policies (no direct reference to nodes table)
DROP POLICY IF EXISTS node_shares_select_access ON node_shares;
DROP POLICY IF EXISTS node_shares_owner_manage ON node_shares;

CREATE POLICY node_shares_select_access ON node_shares
  FOR SELECT
  USING (
    shared_with_stakeholder_id = current_stakeholder_id()
    OR shared_by = current_stakeholder_id()
  );

CREATE POLICY node_shares_owner_manage ON node_shares
  FOR ALL
  USING (shared_by = current_stakeholder_id())
  WITH CHECK (shared_by = current_stakeholder_id());
