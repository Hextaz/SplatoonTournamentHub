-- Migration 33: Add SELECT policy for groups table
-- Fixes issue where groups and group matches could not be read via anon client

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view groups" ON groups;
CREATE POLICY "Public can view groups"
  ON groups FOR SELECT USING (true);
