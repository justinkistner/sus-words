-- First, let's check what rooms exist
SELECT id, name, current_phase, current_round, total_rounds
FROM rooms
ORDER BY created_at DESC
LIMIT 10;

-- Check if game_rounds entry exists for the test room
SELECT 
    r.id as room_id,
    r.current_phase,
    r.current_round,
    gr.round_number,
    gr.faker_id,
    gr.secret_word
FROM rooms r
LEFT JOIN game_rounds gr ON r.id = gr.room_id AND r.current_round = gr.round_number
WHERE r.name LIKE '%Test All Events%';

-- Check all game_rounds
SELECT * FROM game_rounds LIMIT 10;

-- Check room details
SELECT id, name, current_phase, current_round, total_rounds, secret_word, word_grid
FROM rooms 
WHERE name LIKE '%Test All Events%';
