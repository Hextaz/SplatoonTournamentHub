-- 1. Enum Types
CREATE TYPE phase_status AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE phase_type AS ENUM ('ROUND_ROBIN', 'SINGLE_ELIM', 'SWISS');

-- 1.5 Server Settings Table
CREATE TABLE server_settings (
    guild_id VARCHAR(50) PRIMARY KEY,
    to_role_id VARCHAR(50),
    captain_role_id VARCHAR(50),
    checkin_channel_id VARCHAR(50),
    announcement_channel_id VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tournaments Table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ,
    tie_breaker_method VARCHAR(50) DEFAULT 'HEAD_TO_HEAD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Phases Table
CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phase_order INT NOT NULL,
    status phase_status DEFAULT 'DRAFT',
    format phase_type NOT NULL,
    max_groups INT,
    allow_asymmetric_groups BOOLEAN DEFAULT FALSE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_name_per_tournament UNIQUE(tournament_id, name)
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
