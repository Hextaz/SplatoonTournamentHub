-- Add registration_channel_id to server_settings
ALTER TABLE server_settings ADD COLUMN registration_channel_id VARCHAR(50);

-- Prevent a captain from creating multiple teams in the same tournament
ALTER TABLE teams ADD CONSTRAINT unique_captain_per_tournament UNIQUE(tournament_id, captain_discord_id);
