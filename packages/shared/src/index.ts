import { z } from "zod";

// Game Types Supported
export type GameType = "GENERIC" | "SPLATOON_3" | "ROCKET_LEAGUE" | "SMASH_BROS" | string;

// Tournament Status
export type TournamentStatus = "DRAFT" | "REGISTRATION" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

// Phase Types
export type PhaseType = "ROUND_ROBIN" | "SINGLE_ELIM" | "SWISS" | "DOUBLE_ELIM";

// Common Domain Interfaces
export interface Tournament {
  id: string;
  guild_id: string;
  name: string;
  description?: string | null;
  is_public: boolean;
  status: TournamentStatus;
  game_type: GameType;
  start_at?: string | null;
  checkin_start_at?: string | null;
  checkin_end_at?: string | null;
  discord_announcement_channel_id?: string | null;
  discord_registration_channel_id?: string | null;
  discord_checkin_channel_id?: string | null;
  discord_captain_role_id?: string | null;
  discord_to_role_id?: string | null;
  admin_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: string;
  tournament_id: string;
  name: string;
  phase_order: number;
  format: PhaseType;
  max_groups?: number | null;
  allow_asymmetric_groups?: boolean;
  bracket_size?: number;
  settings?: Record<string, any>;
  discord_channel_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  captain_discord_id: string;
  is_checked_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  phase_id: string;
  team1_id?: string | null;
  team2_id?: string | null;
  team1_score: number;
  team2_score: number;
  status: string;
  round_number?: number;
  match_number?: number;
  group_id?: string | null;
  next_match_winner_id?: string | null;
  next_match_loser_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Common Zod Schemas
export const CreateTournamentSchema = z.object({
  name: z.string().min(2, "Le nom du tournoi doit comporter au moins 2 caractères"),
  guild_id: z.string().min(1, "guild_id obligatoire"),
  description: z.string().optional().nullable(),
  game_type: z.string().default("GENERIC"),
  start_at: z.string().optional().nullable(),
  checkin_start_at: z.string().optional().nullable(),
  checkin_end_at: z.string().optional().nullable(),
});

export const ReportScoreSchema = z.object({
  match_id: z.string().uuid(),
  team1_score: z.number().min(0),
  team2_score: z.number().min(0),
  reported_by_team_id: z.string().optional(),
});
