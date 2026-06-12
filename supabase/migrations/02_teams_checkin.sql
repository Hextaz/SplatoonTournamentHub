-- Ajout de la colonne pour le statut de Check-in des équipes
ALTER TABLE teams
ADD COLUMN is_checked_in BOOLEAN DEFAULT false;