-- Migration: 0017_add_org_id_to_report_cards
-- Adds organization_id to report_cards table and backfills from the student's user row.
-- Any orphaned rows (student deleted) will have organization_id set to NULL;
-- these are deleted before the NOT NULL constraint is applied.

-- Step 1: Add nullable column first
ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Step 2: Backfill from the student's organization
UPDATE report_cards rc
SET organization_id = u.organization_id
FROM users u
WHERE u.id = rc.student_id;

-- Step 3: Delete orphaned rows (student was deleted; no org to assign)
DELETE FROM report_cards WHERE organization_id IS NULL;

-- Step 4: Enforce NOT NULL now that backfill is complete
ALTER TABLE report_cards ALTER COLUMN organization_id SET NOT NULL;

-- Step 5: Add FK and index
ALTER TABLE report_cards
  ADD CONSTRAINT fk_report_cards_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_report_cards_org ON report_cards(organization_id);
