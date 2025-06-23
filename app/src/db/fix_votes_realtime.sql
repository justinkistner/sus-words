-- Ensure votes table is properly configured for realtime
-- First, check if it's already in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'votes';

-- Add to publication if not already there
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Ensure replica identity is set to FULL
ALTER TABLE votes REPLICA IDENTITY FULL;

-- Enable RLS on votes table
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create a simple policy to allow all operations (for development)
CREATE POLICY "Allow all operations on votes" ON votes
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the changes
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'votes';
