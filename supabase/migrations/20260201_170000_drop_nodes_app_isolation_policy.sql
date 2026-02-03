-- Drop legacy app isolation policies that block inserts (uses current_setting)

DROP POLICY IF EXISTS nodes_app_isolation ON nodes;
DROP POLICY IF EXISTS node_shares_app_isolation ON node_shares;
