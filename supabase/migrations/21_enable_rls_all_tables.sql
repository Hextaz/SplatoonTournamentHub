-- Activer RLS pour TOUTES les tables du projet pour satisfaire les critères de sécurité
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Ajout d'une tolérance au cas où des anciennes tables comme phase_participants existent depuis le Cloud
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'phase_participants') THEN
    EXECUTE 'ALTER TABLE phase_participants ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read" ON phase_participants;';
    EXECUTE 'CREATE POLICY "Allow public read" ON phase_participants FOR SELECT USING (true);';
  END IF;
END $$;

-- Supprimer d'éventuelles "allow public read" existantes pour éviter l'erreur (Policy already exists)
DROP POLICY IF EXISTS "Allow public read" ON tournaments;
DROP POLICY IF EXISTS "Allow public read" ON server_settings;
DROP POLICY IF EXISTS "Allow public read" ON phases;
DROP POLICY IF EXISTS "Allow public read" ON groups;
DROP POLICY IF EXISTS "Allow public read" ON teams;
DROP POLICY IF EXISTS "Allow public read" ON team_members;
DROP POLICY IF EXISTS "Allow public read" ON phase_teams;
DROP POLICY IF EXISTS "Allow public read" ON matches;

-- Ajouter une Policy de lecture PUREMENT PUBLIQUE indispensable aux front-ends visiteurs
CREATE POLICY "Allow public read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON server_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON phases FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON phase_teams FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON matches FOR SELECT USING (true);

-- Correction RLS sur 'server_settings': Autoriser une connexion web d'un possesseur de guilde sans tournois
DROP POLICY IF EXISTS "Owner can edit server settings" ON server_settings;
DROP POLICY IF EXISTS "Owner can insert server settings" ON server_settings;

CREATE POLICY "Owner can edit server settings"
  ON server_settings FOR UPDATE
  USING (
    NOT EXISTS (SELECT 1 FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id)
    OR ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id))
  );

CREATE POLICY "Owner can insert server settings"
  ON server_settings FOR INSERT
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id)
    OR ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id))
  );

-- Garantir la modification admin RLS pour tous les autres objets rattachés "nouveaux ou non"
DROP POLICY IF EXISTS "Owner can modify groups" ON groups;
CREATE POLICY "Owner can modify groups"
  ON groups FOR ALL
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = groups.phase_id LIMIT 1)))
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = groups.phase_id LIMIT 1)));

DROP POLICY IF EXISTS "Owner can modify phase_teams" ON phase_teams;
CREATE POLICY "Owner can modify phase_teams"
  ON phase_teams FOR ALL
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = phase_teams.phase_id LIMIT 1)))
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = phase_teams.phase_id LIMIT 1)));

DROP POLICY IF EXISTS "Owner can modify team_members" ON team_members;
CREATE POLICY "Owner can modify team_members"
  ON team_members FOR ALL
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM teams WHERE teams.id = team_members.team_id LIMIT 1)))
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM teams WHERE teams.id = team_members.team_id LIMIT 1)));

-- Correction des policies de la table 'tournaments' (problème d'arrêts de type array varchar != varchar[])
DROP POLICY IF EXISTS "Owner can edit tournaments" ON tournaments;
DROP POLICY IF EXISTS "Owner can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Owner can delete tournaments" ON tournaments;

CREATE POLICY "Owner can edit tournaments"
  ON tournaments FOR UPDATE
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids)));

CREATE POLICY "Owner can insert tournaments"
  ON tournaments FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids)));

CREATE POLICY "Owner can delete tournaments"
  ON tournaments FOR DELETE
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids)));
