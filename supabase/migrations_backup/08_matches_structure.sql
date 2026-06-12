-- Supabase Migration: 08_matches_structure.sql
-- Adds structural columns to matches (round and sequence number) for Bracket generation
ALTER TABLE matches ADD COLUMN round_number INTEGER;
ALTER TABLE matches ADD COLUMN match_number INTEGER;