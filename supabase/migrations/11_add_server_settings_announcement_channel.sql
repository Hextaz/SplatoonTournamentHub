-- Ajout de la colonne announcement_channel_id à server_settings

ALTER TABLE public.server_settings 
ADD COLUMN IF NOT EXISTS announcement_channel_id text;
