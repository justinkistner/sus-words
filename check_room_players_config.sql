-- Check if room_players is in the supabase_realtime publication
SELECT * FROM get_publication_tables() WHERE tablename = 'room_players';

-- Check replica identity for room_players
SELECT * FROM get_replica_identity('room_players');
