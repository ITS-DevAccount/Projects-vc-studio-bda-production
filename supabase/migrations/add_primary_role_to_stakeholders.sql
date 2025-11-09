-- Add primary_role_id to stakeholders so each stakeholder can have a primary role mapping

ALTER TABLE stakeholders
ADD COLUMN IF NOT EXISTS primary_role_id UUID REFERENCES roles(id);

-- Optional: ensure faster lookups by primary role
CREATE INDEX IF NOT EXISTS idx_stakeholders_primary_role_id ON stakeholders(primary_role_id);

ALTER TABLE stakeholders
ADD COLUMN IF NOT EXISTS is_user BOOLEAN DEFAULT false;

ALTER TABLE stakeholders
ADD COLUMN IF NOT EXISTS invite_uuid UUID;

-- Backfill primary_role_id from existing stakeholder_roles (pick the first role)
WITH ranked_roles AS (
  SELECT
    sr.stakeholder_id,
    sr.role_id,
    sr.role_type,
    ROW_NUMBER() OVER (PARTITION BY sr.stakeholder_id ORDER BY sr.assigned_at ASC, sr.created_at ASC) AS role_rank
  FROM stakeholder_roles sr
  WHERE sr.role_id IS NOT NULL
)
UPDATE stakeholders s
SET primary_role_id = rr.role_id
FROM ranked_roles rr
WHERE rr.stakeholder_id = s.id
  AND rr.role_rank = 1
  AND s.primary_role_id IS NULL;

-- If there are still stakeholders without primary_role_id but with legacy role_type, try to resolve
WITH legacy_roles AS (
  SELECT
    sr.stakeholder_id,
    sr.role_type,
    ROW_NUMBER() OVER (PARTITION BY sr.stakeholder_id ORDER BY sr.assigned_at ASC, sr.created_at ASC) AS role_rank
  FROM stakeholder_roles sr
  WHERE sr.role_type IS NOT NULL
)
UPDATE stakeholders s
SET primary_role_id = r.id
FROM legacy_roles lr
JOIN roles r ON r.code = lr.role_type
WHERE lr.stakeholder_id = s.id
  AND lr.role_rank = 1
  AND s.primary_role_id IS NULL;


