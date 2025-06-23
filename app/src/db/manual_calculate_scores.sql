-- Manually calculate and update scores for the current round
-- Replace 'YOUR_ROOM_ID' with actual room ID

-- First check the current state
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

-- Check votes for this round
SELECT 
    p1.name as voter,
    p2.name as voted_for,
    v.*
FROM votes v
JOIN players p1 ON v.voter_id = p1.id
JOIN players p2 ON v.voted_for_id = p2.id
WHERE v.room_id = 'YOUR_ROOM_ID'
AND v.round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID');

-- Count votes per player
WITH vote_counts AS (
    SELECT 
        voted_for_id,
        COUNT(*) as vote_count
    FROM votes
    WHERE room_id = 'YOUR_ROOM_ID'
    AND round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID')
    GROUP BY voted_for_id
)
SELECT 
    p.name,
    rp.role,
    COALESCE(vc.vote_count, 0) as votes_received
FROM room_players rp
JOIN players p ON rp.player_id = p.id
LEFT JOIN vote_counts vc ON vc.voted_for_id = rp.player_id
WHERE rp.room_id = 'YOUR_ROOM_ID'
ORDER BY votes_received DESC;

-- Manually calculate scores based on the rules:
-- If faker was caught (got most votes), players who voted for faker get 2 points
-- If faker escaped, faker gets 2 points

-- First, identify the faker
WITH faker_info AS (
    SELECT player_id as faker_id
    FROM room_players
    WHERE room_id = 'YOUR_ROOM_ID'
    AND role = 'faker'
),
-- Count votes and find who got the most
vote_counts AS (
    SELECT 
        voted_for_id,
        COUNT(*) as vote_count
    FROM votes
    WHERE room_id = 'YOUR_ROOM_ID'
    AND round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID')
    GROUP BY voted_for_id
    ORDER BY vote_count DESC
    LIMIT 1
)
-- Update scores
SELECT 
    CASE 
        WHEN vc.voted_for_id = fi.faker_id THEN 'Faker was caught!'
        ELSE 'Faker escaped!'
    END as result,
    vc.voted_for_id as most_voted_player,
    fi.faker_id
FROM vote_counts vc
CROSS JOIN faker_info fi;

-- If you want to manually update scores, uncomment and run these:
-- For faker caught scenario (players who voted for faker get 2 points):
/*
UPDATE room_players rp
SET score = COALESCE(score, 0) + 2
FROM votes v, 
     (SELECT player_id FROM room_players WHERE room_id = 'YOUR_ROOM_ID' AND role = 'faker') f
WHERE rp.room_id = 'YOUR_ROOM_ID'
AND rp.player_id = v.voter_id
AND v.room_id = 'YOUR_ROOM_ID'
AND v.round_number = (SELECT current_round FROM rooms WHERE id = 'YOUR_ROOM_ID')
AND v.voted_for_id = f.player_id;
*/

-- For faker escaped scenario (faker gets 2 points):
/*
UPDATE room_players
SET score = COALESCE(score, 0) + 2
WHERE room_id = 'YOUR_ROOM_ID'
AND role = 'faker';
*/
