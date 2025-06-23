-- Check current game state and clue submissions
-- Replace 'YOUR_ROOM_ID' with the actual room ID

-- Check room status
SELECT id, current_phase, current_round
FROM rooms
WHERE id = 'YOUR_ROOM_ID';

-- Check how many players are in the room
SELECT COUNT(*) as player_count
FROM room_players
WHERE room_id = 'YOUR_ROOM_ID';

-- Check how many clues have been submitted for current round
SELECT COUNT(*) as clue_count
FROM clues
WHERE room_id = 'YOUR_ROOM_ID'
AND round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID');

-- List all players and their clue status
SELECT 
    rp.player_id,
    p.name,
    c.clue_text,
    CASE WHEN c.clue_text IS NOT NULL THEN 'Submitted' ELSE 'Not Submitted' END as clue_status
FROM room_players rp
JOIN players p ON rp.player_id = p.id
LEFT JOIN clues c ON c.player_id = rp.player_id 
    AND c.room_id = rp.room_id 
    AND c.round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID')
WHERE rp.room_id = 'YOUR_ROOM_ID';
