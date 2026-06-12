ALTER TABLE tournaments ADD COLUMN discord_registration_channel_id TEXT;
ALTER TABLE tournaments ADD COLUMN is_registration_open BOOLEAN DEFAULT FALSE;