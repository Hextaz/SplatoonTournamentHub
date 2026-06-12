-- Supabase Migration: 03_checkin_scheduler.sql
-- Ajoute les colonnes nécessaires à l'automatisation du check-in.

ALTER TABLE tournaments
ADD COLUMN checkin_start_at TIMESTAMPTZ,
ADD COLUMN checkin_end_at TIMESTAMPTZ,
ADD COLUMN checkin_message_id TEXT;
