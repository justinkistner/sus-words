-- Test if realtime is working at all by making a simple change
-- This will help us determine if the issue is with our subscription or Supabase realtime itself

-- First, let's check the current state of the room
SELECT id, name, current_phase, host_id FROM rooms WHERE id = 'f9e77a5c-c603-46c8-9bbe-fd5d48fdf5b6';

-- Make a simple update to test if realtime fires
UPDATE rooms 
SET name = 'Test Realtime Update - ' || EXTRACT(EPOCH FROM NOW())::text
WHERE id = 'f9e77a5c-c603-46c8-9bbe-fd5d48fdf5b6';

-- Check the updated state
SELECT id, name, current_phase, host_id FROM rooms WHERE id = 'f9e77a5c-c603-46c8-9bbe-fd5d48fdf5b6';
