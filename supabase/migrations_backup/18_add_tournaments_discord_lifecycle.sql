-- Add discord_category_id to tournaments to track the created category
ALTER TABLE tournaments ADD COLUMN discord_category_id VARCHAR(50);

-- Phases could have their own single discord channel (for brackets like Top 8)
ALTER TABLE phases ADD COLUMN discord_channel_id VARCHAR(50);

-- Create a groups table for better relational structure and channel tracking
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    discord_channel_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update phase_teams to support referencing an actual group entity 
-- (Kept group_name for transitional safety if needed, but group_id is now the standard)
ALTER TABLE phase_teams ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Update matches to use a strict foreign key for groups instead of a loose VARCHAR(50)
ALTER TABLE matches DROP COLUMN IF EXISTS group_id;
ALTER TABLE matches ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;