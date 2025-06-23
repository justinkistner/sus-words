-- Deep diagnosis of why postgres_changes events are not firing
-- Let's check every possible configuration issue

-- 1. Check if the publication exists and what tables are in it
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 2. Check if the publication is configured correctly
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 3. Check replica identity for our tables
SELECT 
    schemaname, 
    tablename, 
    CASE 
        WHEN c.relreplident = 'd' THEN 'default'
        WHEN c.relreplident = 'n' THEN 'nothing'
        WHEN c.relreplident = 'f' THEN 'full'
        WHEN c.relreplident = 'i' THEN 'index'
    END as replica_identity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_players')
ORDER BY tablename;

-- 4. Check if there are any replication slots
SELECT slot_name, plugin, slot_type, database, active FROM pg_replication_slots;

-- 5. Check if WAL level is set correctly for logical replication
SHOW wal_level;

-- 6. Check if max_replication_slots is sufficient
SHOW max_replication_slots;

-- 7. Check current RLS policies on rooms table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'rooms';

-- 8. Test if we can actually select from rooms table (RLS check)
SELECT id, name, current_phase FROM rooms LIMIT 1;

-- 9. Check if there are any triggers on the rooms table that might interfere
SELECT tgname, tgtype, tgenabled FROM pg_trigger WHERE tgrelid = 'rooms'::regclass;

-- 10. Check if the rooms table has any special constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'rooms'::regclass;
