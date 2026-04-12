-- Ajout de la colonne is_public pour basculer la visibilité du tournoi
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;