-- Debug clues table to see what's stored
SELECT 
    c.id,
    c.room_id,
    c.player_id,
    c.round_number,
    c.clue_text,
    c.submission_order,
    c.created_at,
    p.name as player_name
FROM clues c
JOIN players p ON c.player_id = p.id
WHERE c.room_id = 'YOUR_ROOM_ID_HERE'
ORDER BY c.submission_order;

-- Check if clue_text column exists and its type
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clues'
ORDER BY ordinal_position;
