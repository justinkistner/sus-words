-- Fix realtime publication for rooms table
-- The issue is that room updates are not being broadcast to realtime subscribers

-- First, let's check what tables are currently in the realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Remove all tables from realtime publication to start clean
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS rooms;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS room_players;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS clues;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS votes;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS game_rounds;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS players;

-- Add tables back to realtime publication one by one
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE clues;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;

-- Verify the tables are now in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Also check if there are any replica identity issues
-- Tables need REPLICA IDENTITY for realtime to work properly
SELECT schemaname, tablename, replicaidentity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_players', 'clues', 'votes', 'game_rounds');

-- Set replica identity to FULL for all game tables to ensure realtime works
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE room_players REPLICA IDENTITY FULL;
ALTER TABLE clues REPLICA IDENTITY FULL;
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER TABLE game_rounds REPLICA IDENTITY FULL;
