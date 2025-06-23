-- Fix RLS policies for anonymous users (no authentication)
-- This game uses localStorage player IDs, not Supabase auth

-- First, disable RLS on all tables to allow anonymous access
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies that use auth.uid()
DROP POLICY IF EXISTS "Allow hosts to update their rooms" ON rooms;
DROP POLICY IF EXISTS "Allow players to receive updates for rooms they are in" ON rooms;
DROP POLICY IF EXISTS "Allow players to update their own room_player entry" ON room_players;

-- Create permissive policies for anonymous users

-- Players table: Allow all operations
DROP POLICY IF EXISTS "Allow anyone to insert players" ON players;
DROP POLICY IF EXISTS "Allow anyone to select players" ON players;
CREATE POLICY "Allow all operations on players" 
  ON players FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Rooms table: Allow all operations
DROP POLICY IF EXISTS "Allow anyone to insert rooms" ON rooms;
DROP POLICY IF EXISTS "Allow anyone to select rooms" ON rooms;
CREATE POLICY "Allow all operations on rooms" 
  ON rooms FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Room players table: Allow all operations
DROP POLICY IF EXISTS "Allow anyone to insert room_players" ON room_players;
DROP POLICY IF EXISTS "Allow anyone to select room_players" ON room_players;
CREATE POLICY "Allow all operations on room_players" 
  ON room_players FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Categories table: Allow read access
CREATE POLICY "Allow anyone to read categories" 
  ON categories FOR SELECT 
  USING (true);

-- Words table: Allow read access
CREATE POLICY "Allow anyone to read words" 
  ON words FOR SELECT 
  USING (true);

-- Game rounds table: Allow all operations
CREATE POLICY "Allow all operations on game_rounds" 
  ON game_rounds FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Clues table: Allow all operations
DROP POLICY IF EXISTS "Allow anyone to insert clues" ON clues;
CREATE POLICY "Allow all operations on clues" 
  ON clues FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Votes table: Allow all operations
DROP POLICY IF EXISTS "Allow anyone to insert votes" ON votes;
CREATE POLICY "Allow all operations on votes" 
  ON votes FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Enable realtime for all game tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE clues;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
