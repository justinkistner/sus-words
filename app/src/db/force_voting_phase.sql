-- Force transition to voting phase
-- Replace 'YOUR_ROOM_ID' with the actual room ID

UPDATE rooms
SET current_phase = 'voting'
WHERE id = 'YOUR_ROOM_ID';

-- Verify the update
SELECT id, current_phase, current_round
FROM rooms
WHERE id = 'YOUR_ROOM_ID';
