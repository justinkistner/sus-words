-- Enable realtime for votes table
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Set replica identity to FULL for votes table
ALTER TABLE votes REPLICA IDENTITY FULL;

-- Verify the changes
SELECT * FROM get_publication_tables();
SELECT get_replica_identity('votes');
