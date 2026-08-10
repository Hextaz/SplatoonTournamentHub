-- Migration 34: Add SELECT policy for team_members table
-- Fixes issue where team_members could not be read via anon client

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view team_members" ON team_members;
CREATE POLICY "Public can view team_members"
  ON team_members FOR SELECT USING (true);
