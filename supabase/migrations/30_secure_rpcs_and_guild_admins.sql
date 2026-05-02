-- Migration 30: Secure RPC functions + guild_admins table + is_admin_of_tournament update
-- Fixes P0-1: RPC functions were callable by anyone with anon key (self-promotion attack)
-- Fixes P0-3: RLS checks rely on admin_ids which can be stale; guild_admins is a normalized truth source

-- 1. Restrict add_admin_to_all_tournaments to service_role only
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

-- 2. Restrict remove_admin_from_all_tournaments to service_role only
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

-- 3. Create guild_admins table (normalized truth source for guild-level admin status)
CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('ADMINISTRATOR', 'MANAGE_GUILD', 'TO_ROLE', 'SERVER_OWNER')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (guild_id, discord_id)
);

-- 4. Enable RLS on guild_admins
ALTER TABLE guild_admins ENABLE ROW LEVEL SECURITY;

-- Public can view guild admins (needed for RLS evaluation in is_admin_of_tournament)
CREATE POLICY "Public can view guild_admins" ON guild_admins
  FOR SELECT USING (true);

-- Only service_role can modify guild_admins (bot + web backend)
CREATE POLICY "Service role can modify guild_admins" ON guild_admins
  FOR ALL
  USING (current_setting('request.jwt.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.role', true) = 'service_role');

-- 5. Update is_admin_of_tournament to check guild_admins as primary source
-- Fall back to admin_ids for backward compatibility
CREATE OR REPLACE FUNCTION is_admin_of_tournament(tid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tid
    AND (
      -- Primary check: guild_admins table (kept in sync by bot Discord event handlers)
      EXISTS (
        SELECT 1 FROM guild_admins ga
        WHERE ga.guild_id = t.guild_id
        AND ga.discord_id = (auth.jwt() ->> 'discord_id')::varchar
      )
      OR
      -- Fallback: legacy admin_ids array
      (auth.jwt() ->> 'discord_id')::varchar IN (SELECT unnest(t.admin_ids))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
