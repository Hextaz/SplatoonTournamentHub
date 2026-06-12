-- Ajout des colonnes pour la gestion du Check-in et du rôle de Capitaine
ALTER TABLE server_settings
ADD COLUMN captain_role_id VARCHAR(50),
ADD COLUMN checkin_channel_id VARCHAR(50);