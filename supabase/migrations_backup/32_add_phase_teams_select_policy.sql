-- Migration 32: Add SELECT policy for phase_teams table
-- Fixes issue where phase_teams seeding assignments could not be read via anon client

ALTER TABLE phase_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view phase_teams" ON phase_teams;
CREATE POLICY "Public can view phase_teams"
  ON phase_teams FOR SELECT USING (true);
