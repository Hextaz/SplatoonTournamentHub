-- Migration 27: Atomic match operations + data integrity improvements
-- Fixes race conditions in bracket progression and seeding regeneration

-- 1. Add version column for optimistic locking on matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;

-- 2. Atomic team assignment to next match (prevents race conditions)
CREATE OR REPLACE FUNCTION assign_team_to_match(
  p_target_match_id UUID,
  p_team_id UUID
)
RETURNS TABLE(assigned_slot TEXT, match_id UUID) AS $$
DECLARE
  v_team1 UUID;
  v_team2 UUID;
  v_version INT;
BEGIN
  -- Read current state with row lock
  SELECT team1_id, team2_id, version INTO v_team1, v_team2, v_version
  FROM matches WHERE id = p_target_match_id FOR UPDATE;

  IF v_team1 IS NULL THEN
    UPDATE matches SET team1_id = p_team_id, version = version + 1
    WHERE id = p_target_match_id AND version = v_version;
    IF FOUND THEN
      RETURN QUERY SELECT 'team1'::TEXT, p_target_match_id;
      RETURN;
    END IF;
  ELSIF v_team2 IS NULL AND v_team1 != p_team_id THEN
    UPDATE matches SET team2_id = p_team_id, version = version + 1
    WHERE id = p_target_match_id AND version = v_version;
    IF FOUND THEN
      RETURN QUERY SELECT 'team2'::TEXT, p_target_match_id;
      RETURN;
    END IF;
  END IF;

  -- Match already full or conflict — return empty
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 3. Transactional phase seeding regeneration
CREATE OR REPLACE FUNCTION regenerate_phase_seeding(
  p_phase_id UUID,
  p_participants JSONB
)
RETURNS VOID AS $$
BEGIN
  -- Delete existing phase_teams and matches atomically
  DELETE FROM matches WHERE phase_id = p_phase_id;
  DELETE FROM phase_teams WHERE phase_id = p_phase_id;

  -- Insert new phase_teams from participants JSON array
  -- Each element: { "team_id": "...", "seed": N }
  INSERT INTO phase_teams (phase_id, team_id, seed)
  SELECT p_phase_id, (elem->>'team_id')::UUID, (elem->>'seed')::INT
  FROM jsonb_array_elements(p_participants) AS elem;
END;
$$ LANGUAGE plpgsql;

-- 4. Unique seed constraint per phase (prevents duplicate seeds)
ALTER TABLE phase_teams ADD CONSTRAINT unique_seed_per_phase UNIQUE(phase_id, seed);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_matches_phase_status ON matches(phase_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_group_status ON matches(group_id, status);
CREATE INDEX IF NOT EXISTS idx_phase_teams_phase_seed ON phase_teams(phase_id, seed);
CREATE INDEX IF NOT EXISTS idx_phases_tournament_order ON phases(tournament_id, phase_order);

-- 6. Match status ENUM — add constraint via CHECK since we can't easily change to ENUM with existing data
ALTER TABLE matches ADD CONSTRAINT chk_match_status_valid
  CHECK (status IN ('PENDING', 'IN_PROGRESS', 'WAITING_VALIDATION', 'COMPLETED', 'CONTESTED', 'DISPUTED', 'FF', 'DSQ', 'BYE'));

-- 7. Score validation — non-negative integers
ALTER TABLE matches ADD CONSTRAINT chk_scores_nonnegative
  CHECK (team1_score >= 0 AND team2_score >= 0);
