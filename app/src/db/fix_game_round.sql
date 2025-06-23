-- Fix the game by creating a proper game_rounds entry

-- First, get the room and player information
WITH room_info AS (
  SELECT 
    id as room_id,
    secret_word,
    current_round
  FROM rooms 
  WHERE name LIKE '%Test All Events%'
),
players_in_room AS (
  SELECT 
    rp.player_id
  FROM room_players rp
  JOIN room_info ri ON rp.room_id = ri.room_id
)

-- Create the missing game_rounds entry
INSERT INTO game_rounds (room_id, round_number, secret_word, faker_id)
SELECT 
  ri.room_id,
  1, -- Set to round 1 instead of 0
  ri.secret_word,
  (SELECT player_id FROM players_in_room ORDER BY RANDOM() LIMIT 1) -- Randomly select a faker
FROM room_info ri
ON CONFLICT (room_id, round_number) DO NOTHING;

-- Update the room to have the correct round number
UPDATE rooms 
SET current_round = 1
WHERE name LIKE '%Test All Events%';

-- Clear the secret_word from rooms table (it shouldn't be there)
UPDATE rooms 
SET secret_word = NULL
WHERE name LIKE '%Test All Events%';

-- Verify the fix
SELECT 
  r.id,
  r.name,
  r.current_phase,
  r.current_round,
  gr.round_number,
  gr.secret_word,
  gr.faker_id,
  p.name as faker_name
FROM rooms r
JOIN game_rounds gr ON r.id = gr.room_id AND r.current_round = gr.round_number
LEFT JOIN players p ON gr.faker_id = p.id
WHERE r.name LIKE '%Test All Events%';
