-- Libération partielle des policies limitatives de admin_ids pour laisser 
-- le Service Role (backend Next.js) et le Bot gérer les autorisations via l'API.

DROP TRIGGER IF EXISTS trg_set_tournament_admin ON tournaments;
DROP FUNCTION IF EXISTS set_tournament_creator_as_admin();

-- Note : Ne supprimez pas les règles RLS, elles protègent toujours des accès publics intrusifs. 
-- Le bypass se fera du côté Next.js grâce au `supabaseAdmin` / Service Role Key.
-- La colonne `admin_ids` reste là a titre de log historique de la création, mais on ne s'y fie plus strictement.
