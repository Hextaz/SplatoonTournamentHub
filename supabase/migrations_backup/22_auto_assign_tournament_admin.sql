-- Création d'une fonction pour définir le créateur en tant qu'administrateur
CREATE OR REPLACE FUNCTION set_tournament_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_ids IS NULL OR array_length(NEW.admin_ids, 1) IS NULL THEN
    IF auth.jwt() ->> 'discord_id' IS NOT NULL THEN
      NEW.admin_ids := ARRAY[(auth.jwt() ->> 'discord_id')::varchar];
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_tournament_admin ON tournaments;

CREATE TRIGGER trg_set_tournament_admin
BEFORE INSERT ON tournaments
FOR EACH ROW
EXECUTE FUNCTION set_tournament_creator_as_admin();
