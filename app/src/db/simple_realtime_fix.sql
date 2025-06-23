-- Simple realtime publication fix - just add the necessary tables
-- Skip the DROP commands since some tables may not be in the publication

-- Check current publication status
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add the essential tables for realtime (ignore errors if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE clues;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;

-- Set replica identity to FULL for all game tables to ensure realtime works
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE room_players REPLICA IDENTITY FULL;
ALTER TABLE clues REPLICA IDENTITY FULL;
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER TABLE game_rounds REPLICA IDENTITY FULL;

-- Verify the final publication status
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check replica identity status
SELECT schemaname, tablename, replicaidentity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_players', 'clues', 'votes', 'game_rounds');
