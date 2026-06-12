-- Create an RPC to sync a new dynamic admin (TO or Server Admin) into the admin_ids array of all tournaments for this guild
CREATE OR REPLACE FUNCTION add_admin_to_all_tournaments(target_guild_id TEXT, new_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tournaments
  SET admin_ids = array_append(
    array_remove(admin_ids, new_admin_id), -- Remove it first to avoid duplicates
    new_admin_id
  )
  WHERE guild_id = target_guild_id;
END;
$$;

-- Create an RPC to remove an admin from all tournaments
CREATE OR REPLACE FUNCTION remove_admin_from_all_tournaments(target_guild_id TEXT, removed_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tournaments
  SET admin_ids = array_remove(admin_ids, removed_admin_id)
  WHERE guild_id = target_guild_id;
END;
$$;
