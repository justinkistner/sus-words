-- Manually transition game to results phase and check data
-- Replace 'YOUR_ROOM_ID' with actual room ID

-- First, check current state
SELECT 
    r.id,
    r.current_phase,
    r.current_round,
    rp.player_id,
    p.name,
    rp.role,
    rp.score
FROM rooms r
JOIN room_players rp ON r.id = rp.room_id
JOIN players p ON rp.player_id = p.id
WHERE r.id = 'YOUR_ROOM_ID';

-- Check if all votes are in
SELECT 
    COUNT(DISTINCT rp.player_id) as total_players,
    COUNT(DISTINCT v.voter_id) as players_voted
FROM room_players rp
LEFT JOIN votes v ON v.room_id = rp.room_id 
    AND v.voter_id = rp.player_id 
    AND v.round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID')
WHERE rp.room_id = 'YOUR_ROOM_ID';

-- Manually transition to results phase
UPDATE rooms 
SET current_phase = 'results'
WHERE id = 'YOUR_ROOM_ID';

-- Check who the faker is
SELECT 
    p.name as faker_name,
    rp.player_id as faker_id
FROM room_players rp
JOIN players p ON rp.player_id = p.id
WHERE rp.room_id = 'YOUR_ROOM_ID'
AND rp.role = 'faker';
