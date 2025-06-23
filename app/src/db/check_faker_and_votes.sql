-- Check who the faker is and voting results
-- Replace 'YOUR_ROOM_ID' with actual room ID

-- Check faker assignment
SELECT 
    rp.player_id,
    p.name,
    rp.role
FROM room_players rp
JOIN players p ON rp.player_id = p.id
WHERE rp.room_id = 'YOUR_ROOM_ID'
ORDER BY rp.role DESC;

-- Check votes
SELECT 
    v.voter_id,
    p1.name as voter_name,
    v.voted_for_id,
    p2.name as voted_for_name
FROM votes v
JOIN players p1 ON v.voter_id = p1.id
JOIN players p2 ON v.voted_for_id = p2.id
WHERE v.room_id = 'YOUR_ROOM_ID'
AND v.round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID');

-- Check current scores
SELECT 
    rp.player_id,
    p.name,
    rp.score
FROM room_players rp
JOIN players p ON rp.player_id = p.id
WHERE rp.room_id = 'YOUR_ROOM_ID';
