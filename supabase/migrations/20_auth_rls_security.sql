-- Add admin_ids to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS admin_ids VARCHAR(50)[];

-- Sprint 11: Set up RLS to restrict edits to tournament owners

-- Active l'RLS pour les tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;


-- Fix migration: remove older policies to avoid errors during redeployment
DROP POLICY IF EXISTS "Public can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Owner can edit tournaments" ON tournaments;
DROP POLICY IF EXISTS "Owner can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Owner can delete tournaments" ON tournaments;

DROP POLICY IF EXISTS "Public can view server settings" ON server_settings;
DROP POLICY IF EXISTS "Owner can edit server settings" ON server_settings;
DROP POLICY IF EXISTS "Owner can insert server settings" ON server_settings;

DROP POLICY IF EXISTS "Public can view child items" ON phases;
DROP POLICY IF EXISTS "Owner can modify phases" ON phases;

DROP POLICY IF EXISTS "Public can view teams" ON teams;
DROP POLICY IF EXISTS "Owner can modify teams" ON teams;

DROP POLICY IF EXISTS "Public can view matches" ON matches;
DROP POLICY IF EXISTS "Owner can modify matches" ON matches;

-- TOURNAMENTS
-- Les admins et l'owner peuvent tout faire, tout le monde peut lire
CREATE POLICY "Public can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Owner can edit tournaments"
  ON tournaments FOR UPDATE
  USING ((auth.jwt() ->> 'discord_id') = ANY(admin_ids));

CREATE POLICY "Owner can insert tournaments"
  ON tournaments FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'discord_id') = ANY(admin_ids));

CREATE POLICY "Owner can delete tournaments"
  ON tournaments FOR DELETE
  USING ((auth.jwt() ->> 'discord_id') = ANY(admin_ids));

-- SERVER_SETTINGS
CREATE POLICY "Public can view server settings"
  ON server_settings FOR SELECT
  USING (true);

CREATE POLICY "Owner can edit server settings"
  ON server_settings FOR UPDATE
  USING ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id LIMIT 1)));

CREATE POLICY "Owner can insert server settings"
  ON server_settings FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id LIMIT 1)));

-- PHASES, TEAMS, MATCHES
-- Mêmes règles : lecture pour tous, modif pour le owner du tournoi concerné
CREATE POLICY "Public can view child items"
  ON phases FOR SELECT USING (true);
CREATE POLICY "Owner can modify phases"
  ON phases FOR ALL
  USING ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE id = tournament_id)))
  WITH CHECK ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE id = tournament_id)));

CREATE POLICY "Public can view teams"
  ON teams FOR SELECT USING (true);
CREATE POLICY "Owner can modify teams"
  ON teams FOR ALL
  USING ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE id = tournament_id)))
  WITH CHECK ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE id = tournament_id)));

CREATE POLICY "Public can view matches"
  ON matches FOR SELECT USING (true);
CREATE POLICY "Owner can modify matches"
  ON matches FOR ALL
  USING ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE id = tournament_id)))
  WITH CHECK ((auth.jwt() ->> 'discord_id') = ANY((SELECT admin_ids FROM tournaments WHERE id = tournament_id)));
