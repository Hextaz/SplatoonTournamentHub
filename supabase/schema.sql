-- 1. Enum Types
CREATE TYPE tournament_status AS ENUM ('DRAFT', 'REGISTRATION', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE phase_type AS ENUM ('ROUND_ROBIN', 'SINGLE_ELIM', 'SWISS', 'DOUBLE_ELIM');

-- 1.5 Server Settings Table
CREATE TABLE server_settings (
    guild_id VARCHAR(50) PRIMARY KEY,
    to_role_id VARCHAR(50),
    captain_role_id VARCHAR(50),
    checkin_channel_id VARCHAR(50),
    announcement_channel_id TEXT,
    registration_channel_id VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tournaments Table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    status tournament_status DEFAULT 'DRAFT',
    start_date TIMESTAMPTZ,
    start_at TIMESTAMPTZ,
    tie_breaker_method VARCHAR(50) DEFAULT 'HEAD_TO_HEAD',
    checkin_start_at TIMESTAMPTZ,
    checkin_end_at TIMESTAMPTZ,
    checkin_message_id TEXT,
    discord_announcement_channel_id TEXT,
    discord_registration_channel_id TEXT,
    is_registration_open BOOLEAN DEFAULT FALSE,
    discord_checkin_channel_id TEXT,
    discord_captain_role_id TEXT,
    discord_to_role_id TEXT,
    discord_category_id VARCHAR(50),
    admin_ids VARCHAR(50)[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Phases Table
CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phase_order INT NOT NULL,
    format phase_type NOT NULL,
    max_groups INT,
    allow_asymmetric_groups BOOLEAN DEFAULT FALSE,
    bracket_size INTEGER DEFAULT 8,
    settings JSONB DEFAULT '{}'::jsonb,
    discord_channel_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a groups table for better relational structure and channel tracking
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    discord_channel_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teams Table
-- Representing the Global "Pool" once registered
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL, -- Strict 32 characters rule
    captain_discord_id VARCHAR(50) NOT NULL,
    check_in_status BOOLEAN DEFAULT FALSE,
    is_checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_name_per_tournament UNIQUE(tournament_id, name),
    CONSTRAINT unique_captain_per_tournament UNIQUE(tournament_id, captain_discord_id)
);

-- 5. Team Members Table (Replacing Players)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(50), -- Only required for the captain (Discord ID)
    ingame_name VARCHAR(50) NOT NULL,
    friend_code VARCHAR(25) NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: A trigger/function could enforce the max 6 players per team rule.

-- 6. Teams in Phases (Many-to-Many representing Seeding/Pool -> Phase)
CREATE TABLE phase_teams (
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    seed INT,
    group_name VARCHAR(50), -- Used if phase is ROUND_ROBIN
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    PRIMARY KEY(phase_id, team_id)
);

-- 7. Matches Table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team1_score INT DEFAULT 0,
    team2_score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, DISPUTED, FF, DSQ
    discord_channel_id VARCHAR(50), -- To link Discord channel generating commands
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    next_match_winner_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    next_match_loser_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    reported_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    round_number INTEGER,
    match_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Sprint 11: Set up RLS to restrict edits to tournament owners

-- Active l'RLS pour les tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- TOURNAMENTS
-- Les admins et l'owner peuvent tout faire, tout le monde peut lire
CREATE POLICY "Public can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Owner can edit tournaments"
  ON tournaments FOR UPDATE
    USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids)));

CREATE POLICY "Owner can insert tournaments"
    ON tournaments FOR INSERT
    WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids)));

CREATE POLICY "Owner can delete tournaments"
    ON tournaments FOR DELETE
    USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids)));
CREATE POLICY "Public can view server settings"
  ON server_settings FOR SELECT
  USING (true);

CREATE POLICY "Owner can edit server settings"
  ON server_settings FOR UPDATE
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id));

CREATE POLICY "Owner can insert server settings"
  ON server_settings FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id));

CREATE POLICY "Service role can modify server settings"
  ON server_settings FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

-- PHASES, TEAMS, MATCHES
-- Mï¿½ï¿½mes rï¿½ï¿½gles : lecture pour tous, modif pour le owner du tournoi concernï¿½ï¿½
CREATE POLICY "Public can view child items"
  ON phases FOR SELECT USING (true);
CREATE POLICY "Owner can modify phases"
  ON phases FOR ALL
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = tournament_id))
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = tournament_id));

CREATE POLICY "Public can view teams"
  ON teams FOR SELECT USING (true);
CREATE POLICY "Owner can modify teams"
  ON teams FOR ALL
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = tournament_id))
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = tournament_id));

CREATE POLICY "Public can view matches"
  ON matches FOR SELECT USING (true);
CREATE POLICY "Owner can modify matches"
  ON matches FOR ALL
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = matches.phase_id LIMIT 1)));
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view groups"
  ON groups FOR SELECT USING (true);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE phase_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view phase_teams"
  ON phase_teams FOR SELECT USING (true);

-- Création d'une fonction pour définir le créateur en tant qu'administrateur
CREATE OR REPLACE FUNCTION set_tournament_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_ids IS NULL OR array_length(NEW.admin_ids, 1) IS NULL THEN
    IF auth.jwt() ->> 'discord_id' IS NOT NULL THEN
      NEW.admin_ids := ARRAY[(auth.jwt() ->> 'discord_id')::varchar];
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_tournament_admin ON tournaments;

CREATE TRIGGER trg_set_tournament_admin
BEFORE INSERT ON tournaments
FOR EACH ROW
EXECUTE FUNCTION set_tournament_creator_as_admin();

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



-- Migration 26 : Nettoyage des permissions obsolètes des capitaines (inscriptions gérées via Discord)
DROP POLICY IF EXISTS "Captains can create teams" ON teams;
DROP POLICY IF EXISTS "Captains can modify their team" ON teams;
DROP POLICY IF EXISTS "Captains can delete their team" ON teams;
DROP POLICY IF EXISTS "Captains can insert team members" ON team_members;
DROP POLICY IF EXISTS "Captains can modify team members" ON team_members;
DROP POLICY IF EXISTS "Captains can delete team members" ON team_members;

-- =============================================================================
--  Permissions pour le rôle anonyme (utilisé par le frontend) et le service_role
-- =============================================================================
GRANT SELECT ON TABLE
  server_settings,
  tournaments,
  phases,
  teams,
  matches,
  groups,
  team_members,
  phase_teams
TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- =============================================================================
--  Migrations 27-30 (Atomic operations, RPCs & guild_admins)
-- =============================================================================

-- Migration 27: Atomic match operations + data integrity improvements
ALTER TABLE matches ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;

CREATE OR REPLACE FUNCTION assign_team_to_match(
  p_target_match_id UUID,
  p_team_id UUID
)
RETURNS TABLE(assigned_slot TEXT, match_id UUID) AS $$
DECLARE
  v_team1 UUID;
  v_team2 UUID;
  v_version INT;
BEGIN
  SELECT team1_id, team2_id, version INTO v_team1, v_team2, v_version
  FROM matches WHERE id = p_target_match_id FOR UPDATE;

  IF v_team1 IS NULL THEN
    UPDATE matches SET team1_id = p_team_id, version = version + 1
    WHERE id = p_target_match_id AND version = v_version;
    IF FOUND THEN
      RETURN QUERY SELECT 'team1'::TEXT, p_target_match_id;
      RETURN;
    END IF;
  ELSIF v_team2 IS NULL AND v_team1 != p_team_id THEN
    UPDATE matches SET team2_id = p_team_id, version = version + 1
    WHERE id = p_target_match_id AND version = v_version;
    IF FOUND THEN
      RETURN QUERY SELECT 'team2'::TEXT, p_target_match_id;
      RETURN;
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION regenerate_phase_seeding(
  p_phase_id UUID,
  p_participants JSONB
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM matches WHERE phase_id = p_phase_id;
  DELETE FROM phase_teams WHERE phase_id = p_phase_id;

  INSERT INTO phase_teams (phase_id, team_id, seed)
  SELECT p_phase_id, (elem->>'team_id')::UUID, (elem->>'seed')::INT
  FROM jsonb_array_elements(p_participants) AS elem;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE phase_teams DROP CONSTRAINT IF EXISTS unique_seed_per_phase;
ALTER TABLE phase_teams ADD CONSTRAINT unique_seed_per_phase UNIQUE(phase_id, seed);

CREATE INDEX IF NOT EXISTS idx_matches_phase_status ON matches(phase_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_group_status ON matches(group_id, status);
CREATE INDEX IF NOT EXISTS idx_phase_teams_phase_seed ON phase_teams(phase_id, seed);
CREATE INDEX IF NOT EXISTS idx_phases_tournament_order ON phases(tournament_id, phase_order);

ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_match_status_valid;
ALTER TABLE matches ADD CONSTRAINT chk_match_status_valid
  CHECK (status IN ('PENDING', 'IN_PROGRESS', 'WAITING_VALIDATION', 'COMPLETED', 'CONTESTED', 'DISPUTED', 'FF', 'DSQ', 'BYE'));

ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_scores_nonnegative;
ALTER TABLE matches ADD CONSTRAINT chk_scores_nonnegative
  CHECK (team1_score >= 0 AND team2_score >= 0);

-- Migration 28: Relax tournaments RLS
DROP TRIGGER IF EXISTS trg_set_tournament_admin ON tournaments;
DROP FUNCTION IF EXISTS set_tournament_creator_as_admin();

-- Migration 29 & 30: Admin sync RPCs & guild_admins table
CREATE OR REPLACE FUNCTION add_admin_to_all_tournaments(target_guild_id TEXT, new_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_append(
    array_remove(admin_ids, new_admin_id),
    new_admin_id
  )
  WHERE guild_id = target_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_admin_from_all_tournaments(target_guild_id TEXT, removed_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_remove(admin_ids, removed_admin_id)
  WHERE guild_id = target_guild_id;
END;
$$;

-- Migration 30: guild_admins table & is_admin_of_tournament update
CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('ADMINISTRATOR', 'MANAGE_GUILD', 'TO_ROLE', 'SERVER_OWNER')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (guild_id, discord_id)
);

ALTER TABLE guild_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view guild_admins" ON guild_admins;
CREATE POLICY "Public can view guild_admins" ON guild_admins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can modify guild_admins" ON guild_admins;
CREATE POLICY "Service role can modify guild_admins" ON guild_admins
  FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

CREATE OR REPLACE FUNCTION is_admin_of_tournament(tid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tid
    AND (
      EXISTS (
        SELECT 1 FROM guild_admins ga
        WHERE ga.guild_id = t.guild_id
        AND ga.discord_id = (auth.jwt() ->> 'discord_id')::varchar
      )
      OR
      (auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(t.admin_ids))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT ALL ON TABLE guild_admins TO anon, service_role;




-- Migration 31: Fix server_settings permissions, ensure guild_admins table and service_role GRANTs
-- Fixes permission denied (42501) when service_role inserts into server_settings
-- Ensures guild_admins table, RPCs, and RLS policies are up to date in production

-- 1. Create guild_admins table if not exists
CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('ADMINISTRATOR', 'MANAGE_GUILD', 'TO_ROLE', 'SERVER_OWNER')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (guild_id, discord_id)
);

-- 2. Enable RLS on guild_admins
ALTER TABLE guild_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view guild_admins" ON guild_admins;
CREATE POLICY "Public can view guild_admins" ON guild_admins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can modify guild_admins" ON guild_admins;
CREATE POLICY "Service role can modify guild_admins" ON guild_admins
  FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

-- 3. Add service_role RLS policy on server_settings
DROP POLICY IF EXISTS "Service role can modify server settings" ON server_settings;
CREATE POLICY "Service role can modify server settings" ON server_settings
  FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

-- 4. Ensure service_role has FULL privileges across all public tables, sequences, and routines
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 5. Update is_admin_of_tournament helper function to rely on guild_admins
CREATE OR REPLACE FUNCTION is_admin_of_tournament(tid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tid
    AND (
      EXISTS (
        SELECT 1 FROM guild_admins ga
        WHERE ga.guild_id = t.guild_id
        AND ga.discord_id = (auth.jwt() ->> 'discord_id')::varchar
      )
      OR
      (auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(t.admin_ids))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPCs to sync admins safely
CREATE OR REPLACE FUNCTION add_admin_to_all_tournaments(target_guild_id TEXT, new_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_append(
    array_remove(admin_ids, new_admin_id),
    new_admin_id
  )
  WHERE guild_id = target_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_admin_from_all_tournaments(target_guild_id TEXT, removed_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_remove(admin_ids, removed_admin_id)
  WHERE guild_id = target_guild_id;
END;
$$;


-- Migration 32: Add SELECT policy for phase_teams table
-- Fixes issue where phase_teams seeding assignments could not be read via anon client

ALTER TABLE phase_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view phase_teams" ON phase_teams;
CREATE POLICY "Public can view phase_teams"
  ON phase_teams FOR SELECT USING (true);


-- Migration 33: Add SELECT policy for groups table
-- Fixes issue where groups and group matches could not be read via anon client

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view groups" ON groups;
CREATE POLICY "Public can view groups"
  ON groups FOR SELECT USING (true);


-- Migration 34: Add SELECT policy for team_members table
-- Fixes issue where team_members could not be read via anon client

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view team_members" ON team_members;
CREATE POLICY "Public can view team_members"
  ON team_members FOR SELECT USING (true);

