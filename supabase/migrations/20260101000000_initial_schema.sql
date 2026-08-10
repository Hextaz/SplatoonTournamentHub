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
    status VARCHAR(50) DEFAULT 'PENDING',
    discord_channel_id VARCHAR(50),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    next_match_winner_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    next_match_loser_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    reported_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    round_number INTEGER,
    match_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active RLS for tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public can view server settings" ON server_settings FOR SELECT USING (true);

CREATE POLICY "Service role can modify server settings" ON server_settings FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

CREATE POLICY "Public can view child items" ON phases FOR SELECT USING (true);
CREATE POLICY "Public can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public can view matches" ON matches FOR SELECT USING (true);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view groups" ON groups FOR SELECT USING (true);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view team_members" ON team_members FOR SELECT USING (true);

ALTER TABLE phase_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view phase_teams" ON phase_teams FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('ADMINISTRATOR', 'MANAGE_GUILD', 'TO_ROLE', 'SERVER_OWNER')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (guild_id, discord_id)
);

ALTER TABLE guild_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view guild_admins" ON guild_admins FOR SELECT USING (true);
CREATE POLICY "Service role can modify guild_admins" ON guild_admins FOR ALL
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

CREATE POLICY "Owner can modify teams" ON teams FOR ALL
  USING (is_admin_of_tournament(tournament_id))
  WITH CHECK (is_admin_of_tournament(tournament_id));

CREATE POLICY "Owner can modify team_members" ON team_members FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM teams WHERE id = team_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM teams WHERE id = team_id LIMIT 1)));

CREATE POLICY "Owner can modify groups" ON groups FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)));

CREATE POLICY "Owner can modify phase_teams" ON phase_teams FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)));

CREATE POLICY "Owner can modify phases" ON phases FOR ALL
  USING (is_admin_of_tournament(tournament_id))
  WITH CHECK (is_admin_of_tournament(tournament_id));

CREATE POLICY "Owner can modify matches" ON matches FOR ALL
  USING (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)))
  WITH CHECK (is_admin_of_tournament((SELECT tournament_id FROM phases WHERE id = phase_id LIMIT 1)));

GRANT SELECT ON TABLE
  server_settings, tournaments, phases, teams, matches, groups, team_members, phase_teams, guild_admins
TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

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

CREATE OR REPLACE FUNCTION add_admin_to_all_tournaments(target_guild_id TEXT, new_admin_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_append(array_remove(admin_ids, new_admin_id), new_admin_id)
  WHERE guild_id = target_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_admin_from_all_tournaments(target_guild_id TEXT, removed_admin_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_remove(admin_ids, removed_admin_id)
  WHERE guild_id = target_guild_id;
END;
$$;
