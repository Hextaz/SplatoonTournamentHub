-- Migration: Add game_type column to tournaments table for Multi-game support
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS game_type VARCHAR(50) DEFAULT 'GENERIC';
