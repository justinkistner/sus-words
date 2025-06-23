-- Function to check which tables are in the supabase_realtime publication
CREATE OR REPLACE FUNCTION get_publication_tables(publication_name text)
RETURNS TABLE(schemaname text, tablename text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.nspname AS schemaname,
    c.relname AS tablename
  FROM pg_publication_tables pt
  JOIN pg_class c ON c.oid = pt.prrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE pt.pubname = publication_name;
END;
$$;

-- Function to check replica identity for a table
CREATE OR REPLACE FUNCTION get_replica_identity(table_name text)
RETURNS TABLE(table_name text, replica_identity text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text AS table_name,
    CASE c.relreplident
      WHEN 'd' THEN 'default'
      WHEN 'n' THEN 'nothing'
      WHEN 'f' THEN 'full'
      WHEN 'i' THEN 'index'
      ELSE 'unknown'
    END AS replica_identity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = $1
    AND n.nspname = 'public'
    AND c.relkind = 'r';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_publication_tables(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_replica_identity(text) TO anon, authenticated;
