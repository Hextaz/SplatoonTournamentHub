-- Add language column to server_settings and tournaments
ALTER TABLE server_settings ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
