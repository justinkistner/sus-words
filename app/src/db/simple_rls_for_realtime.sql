-- Enable simple RLS policies to allow realtime to work
-- Supabase realtime might require RLS to be enabled to deliver events

-- Enable RLS on the tables we need for realtime
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Create very simple, permissive policies that won't cause recursion
CREATE POLICY "Allow all access to rooms" ON rooms
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to room_players" ON room_players
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_players');

-- Test that we can still query the tables
SELECT id, name, current_phase FROM rooms LIMIT 1;
SELECT room_id, player_id FROM room_players LIMIT 1;
