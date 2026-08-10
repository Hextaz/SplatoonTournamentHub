-- Migration 31: Fix server_settings permissions, ensure guild_admins table and service_role GRANTs
-- Fixes permission denied (42501) when service_role inserts into server_settings
-- Ensures guild_admins table, RPCs, and RLS policies are up to date in production

-- 1. Create guild_admins table if not exists
CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('ADMINISTRATOR', 'MANAGE_GUILD', 'TO_ROLE', 'SERVER_OWNER')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (guild_id, discord_id)
);

-- 2. Enable RLS on guild_admins
ALTER TABLE guild_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view guild_admins" ON guild_admins;
CREATE POLICY "Public can view guild_admins" ON guild_admins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can modify guild_admins" ON guild_admins;
CREATE POLICY "Service role can modify guild_admins" ON guild_admins
  FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

-- 3. Add service_role RLS policy on server_settings
DROP POLICY IF EXISTS "Service role can modify server settings" ON server_settings;
CREATE POLICY "Service role can modify server settings" ON server_settings
  FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

-- 4. Ensure service_role has FULL privileges across all public tables, sequences, and routines
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 5. Update is_admin_of_tournament helper function to rely on guild_admins
CREATE OR REPLACE FUNCTION is_admin_of_tournament(tid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tid
    AND (
      EXISTS (
        SELECT 1 FROM guild_admins ga
        WHERE ga.guild_id = t.guild_id
        AND ga.discord_id = (auth.jwt() ->> 'discord_id')::varchar
      )
      OR
      (auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(t.admin_ids))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPCs to sync admins safely
CREATE OR REPLACE FUNCTION add_admin_to_all_tournaments(target_guild_id TEXT, new_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_append(
    array_remove(admin_ids, new_admin_id),
    new_admin_id
  )
  WHERE guild_id = target_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_admin_from_all_tournaments(target_guild_id TEXT, removed_admin_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('request.jwt.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can call this function';
  END IF;

  UPDATE tournaments
  SET admin_ids = array_remove(admin_ids, removed_admin_id)
  WHERE guild_id = target_guild_id;
END;
$$;
