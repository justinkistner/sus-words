-- Fix RLS policy for rooms table to ensure all players can receive real-time updates
-- This should be run in the Supabase SQL Editor

-- First, drop the existing policy
DROP POLICY IF EXISTS "Allow hosts to update their rooms" ON rooms;

-- Create a new policy that allows hosts to update rooms
CREATE POLICY "Allow hosts to update their rooms" 
  ON rooms FOR UPDATE 
  USING (host_id = auth.uid());

-- Create a policy that allows all players to receive real-time updates for rooms they are in
-- This is needed for the Supabase real-time subscription to work properly
CREATE POLICY "Allow players to receive updates for rooms they are in" 
  ON rooms FOR SELECT 
  USING (
    id IN (
      SELECT room_id 
      FROM room_players 
      WHERE player_id = auth.uid()
    )
  );
