-- Migration 24 : Simplification et sécurisation de la vérification Admin
CREATE OR REPLACE FUNCTION is_admin_of_tournament(tid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = tid
    AND (auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour 'teams'
DROP POLICY IF EXISTS "Owner can modify teams" ON teams;
CREATE POLICY "Owner can modify teams" ON teams
  FOR ALL
  USING (is_admin_of_tournament(tournament_id))
  WITH CHECK (is_admin_of_tournament(tournament_id));

-- Mettre à jour 'team_members'
DROP POLICY IF EXISTS "Owner can modify team_members" ON team_members;
CREATE POLICY "Owner can modify team_members" ON team_members
  FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM teams WHERE id = team_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM teams WHERE id = team_id LIMIT 1)));

-- Mettre à jour 'groups'
DROP POLICY IF EXISTS "Owner can modify groups" ON groups;
CREATE POLICY "Owner can modify groups" ON groups
  FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)));

-- Mettre à jour 'phase_teams'
DROP POLICY IF EXISTS "Owner can modify phase_teams" ON phase_teams;
CREATE POLICY "Owner can modify phase_teams" ON phase_teams
  FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)));
