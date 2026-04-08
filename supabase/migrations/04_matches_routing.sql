-- Supabase Migration: 04_matches_routing.sql
-- Ajout des colonnes de routage à la table matches existante

ALTER TABLE matches
ADD COLUMN next_match_winner_id UUID REFERENCES matches(id) ON DELETE SET NULL,
ADD COLUMN next_match_loser_id UUID REFERENCES matches(id) ON DELETE SET NULL,
ADD COLUMN reported_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
