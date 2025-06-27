-- RLS Policies for Sus Word Game
-- This file contains additional RLS policies to allow proper game functionality

-- Allow anyone to insert into players table (needed for anonymous users to create players)
CREATE POLICY "Allow anyone to insert players" 
  ON players FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to select from players table
CREATE POLICY "Allow anyone to select players" 
  ON players FOR SELECT 
  USING (true);

-- Allow anyone to insert into rooms table
CREATE POLICY "Allow anyone to insert rooms" 
  ON rooms FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to select from rooms table
CREATE POLICY "Allow anyone to select rooms" 
  ON rooms FOR SELECT 
  USING (true);

-- Allow anyone to update rooms they are hosting
CREATE POLICY "Allow hosts to update their rooms" 
  ON rooms FOR UPDATE 
  USING (host_id = auth.uid());

-- Allow anyone to insert into room_players table
CREATE POLICY "Allow anyone to insert room_players" 
  ON room_players FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to select from room_players table
CREATE POLICY "Allow anyone to select room_players" 
  ON room_players FOR SELECT 
  USING (true);

-- Allow anyone to update their own room_player entry
CREATE POLICY "Allow players to update their own room_player entry" 
  ON room_players FOR UPDATE 
  USING (player_id = auth.uid());

-- Allow anyone to insert into clues table
CREATE POLICY "Allow anyone to insert clues" 
  ON clues FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to insert into votes table
CREATE POLICY "Allow anyone to insert votes" 
  ON votes FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to insert into game_rounds table
CREATE POLICY "Allow anyone to insert game_rounds" 
  ON game_rounds FOR INSERT 
  WITH CHECK (true);

-- For now, allow anyone to select from all tables for development purposes
CREATE POLICY "Allow anyone to select from categories" 
  ON categories FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to select from words" 
  ON words FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to select from game_rounds" 
  ON game_rounds FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to select from clues" 
  ON clues FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to select from votes" 
  ON votes FOR SELECT 
  USING (true);
