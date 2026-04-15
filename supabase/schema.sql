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
  USING ((auth.jwt() ->> 'discord_id')::varchar = ANY(admin_ids));

CREATE POLICY "Owner can insert tournaments"
  ON tournaments FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar = ANY(admin_ids));

CREATE POLICY "Owner can delete tournaments"
  ON tournaments FOR DELETE
  USING ((auth.jwt() ->> 'discord_id')::varchar = ANY(admin_ids));

-- SERVER_SETTINGS
CREATE POLICY "Public can view server settings"
  ON server_settings FOR SELECT
  USING (true);

CREATE POLICY "Owner can edit server settings"
  ON server_settings FOR UPDATE
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id));

CREATE POLICY "Owner can insert server settings"
  ON server_settings FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE tournaments.guild_id = server_settings.guild_id));

-- PHASES, TEAMS, MATCHES
-- M��mes r��gles : lecture pour tous, modif pour le owner du tournoi concern��
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
  USING ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = matches.phase_id LIMIT 1)))
  WITH CHECK ((auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(admin_ids) FROM tournaments WHERE id = (SELECT tournament_id FROM phases WHERE phases.id = matches.phase_id LIMIT 1)));

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE phase_teams ENABLE ROW LEVEL SECURITY;
