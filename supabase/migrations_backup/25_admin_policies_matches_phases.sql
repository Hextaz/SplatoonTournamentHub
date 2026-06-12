-- Migration 25 : Application de 'is_admin_of_tournament' à toutes les sous-structures restantes (phases, matches)
-- Mettre à jour 'phases'
DROP POLICY IF EXISTS "Owner can modify phases" ON phases;
CREATE POLICY "Owner can modify phases" ON phases
  FOR ALL
  USING (is_admin_of_tournament(tournament_id))
  WITH CHECK (is_admin_of_tournament(tournament_id));

-- Mettre à jour 'matches'
DROP POLICY IF EXISTS "Owner can modify matches" ON matches;
CREATE POLICY "Owner can modify matches" ON matches
  FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)));
