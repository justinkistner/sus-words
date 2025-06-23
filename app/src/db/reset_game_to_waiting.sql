-- Reset the game back to waiting phase so it can be started properly
UPDATE rooms 
SET 
    current_phase = 'waiting',
    current_round = 0
WHERE name LIKE '%Test All Events%';

-- Optional: Delete any incomplete game_rounds entries for this room
DELETE FROM game_rounds 
WHERE room_id IN (SELECT id FROM rooms WHERE name LIKE '%Test All Events%');

-- Optional: Delete any clues that might have been submitted
DELETE FROM clues 
WHERE room_id IN (SELECT id FROM rooms WHERE name LIKE '%Test All Events%');
