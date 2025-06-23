-- Complete RLS cleanup - drop all remaining policies
-- Based on the actual policies found in the database

-- Drop the remaining policies that weren't caught by the previous script
DROP POLICY IF EXISTS "Rooms are viewable by all authenticated users" ON rooms;
DROP POLICY IF EXISTS "Allow anyone to select from categories" ON categories;
DROP POLICY IF EXISTS "Allow anyone to select from words" ON words;
DROP POLICY IF EXISTS "Allow anyone to select from game_rounds" ON game_rounds;
DROP POLICY IF EXISTS "Allow anyone to insert game_rounds" ON game_rounds;
DROP POLICY IF EXISTS "Room players are viewable by players in the same room" ON room_players;
DROP POLICY IF EXISTS "Allow anyone to select from clues" ON clues;
DROP POLICY IF EXISTS "Clues are viewable by players in the same room" ON clues;
DROP POLICY IF EXISTS "Allow anyone to select from votes" ON votes;

-- Also drop any other possible policy variations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON rooms;
DROP POLICY IF EXISTS "Enable read access for all users" ON rooms;
DROP POLICY IF EXISTS "Enable insert for all users" ON rooms;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON rooms;

-- Drop any policies on players table that might exist
DROP POLICY IF EXISTS "Players are viewable by everyone" ON players;
DROP POLICY IF EXISTS "Enable insert for all users" ON players;
DROP POLICY IF EXISTS "Enable read access for all users" ON players;

-- Verify all policies are gone
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- This should return an empty result set if successful
