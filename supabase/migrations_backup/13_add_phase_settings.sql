-- Ajouter les parametres specifiques aux phases
ALTER TABLE public.phases ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;