-- Add is_ready_for_clues column to room_players table
ALTER TABLE room_players ADD COLUMN is_ready_for_clues BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX idx_room_players_ready_for_clues ON room_players(room_id, is_ready_for_clues);
