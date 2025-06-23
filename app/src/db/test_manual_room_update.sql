-- Test if realtime events fire with a manual room update
-- This will help us determine if the issue is with the startGame function or realtime events in general

-- Check current room state
SELECT id, name, current_phase, host_id FROM rooms WHERE id = 'f9e77a5c-c603-46c8-9bbe-fd5d48fdf5b6';

-- Make a simple manual update to test realtime
UPDATE rooms 
SET name = 'Manual Test Update - ' || EXTRACT(EPOCH FROM NOW())::text
WHERE id = 'f9e77a5c-c603-46c8-9bbe-fd5d48fdf5b6';

-- Check updated state
SELECT id, name, current_phase, host_id FROM rooms WHERE id = 'f9e77a5c-c603-46c8-9bbe-fd5d48fdf5b6';
