-- Node sharing RLS updates: public (authenticated) + selective sharing

-- Nodes: SELECT access (owner, public, or shared)
DROP POLICY IF EXISTS nodes_owner_access ON nodes;
CREATE POLICY nodes_owner_access ON nodes
  FOR SELECT
  USING (
    owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    OR is_shared = true
    OR EXISTS (
      SELECT 1
      FROM node_shares ns
      JOIN stakeholders s ON s.id = ns.shared_with_stakeholder_id
      WHERE ns.node_id = nodes.id
        AND s.auth_user_id = auth.uid()
    )
  );

-- Nodes: UPDATE access (owner, or shared with edit/admin)
DROP POLICY IF EXISTS nodes_owner_update ON nodes;
CREATE POLICY nodes_owner_update ON nodes
  FOR UPDATE
  USING (
    owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM node_shares ns
      JOIN stakeholders s ON s.id = ns.shared_with_stakeholder_id
      WHERE ns.node_id = nodes.id
        AND s.auth_user_id = auth.uid()
        AND ns.permission IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM node_shares ns
      JOIN stakeholders s ON s.id = ns.shared_with_stakeholder_id
      WHERE ns.node_id = nodes.id
        AND s.auth_user_id = auth.uid()
        AND ns.permission IN ('edit', 'admin')
    )
  );

-- Nodes: DELETE access (owner, or shared with admin)
DROP POLICY IF EXISTS nodes_owner_delete ON nodes;
CREATE POLICY nodes_owner_delete ON nodes
  FOR DELETE
  USING (
    owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM node_shares ns
      JOIN stakeholders s ON s.id = ns.shared_with_stakeholder_id
      WHERE ns.node_id = nodes.id
        AND s.auth_user_id = auth.uid()
        AND ns.permission = 'admin'
    )
  );

-- Node shares: SELECT access (owner or recipient)
DROP POLICY IF EXISTS node_shares_select_access ON node_shares;
CREATE POLICY node_shares_select_access ON node_shares
  FOR SELECT
  USING (
    node_shares.shared_with_stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM nodes n
      WHERE n.id = node_shares.node_id
        AND n.owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );

-- Node shares: owner can manage
DROP POLICY IF EXISTS node_shares_owner_manage ON node_shares;
CREATE POLICY node_shares_owner_manage ON node_shares
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM nodes n
      WHERE n.id = node_shares.node_id
        AND n.owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM nodes n
      WHERE n.id = node_shares.node_id
        AND n.owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );
