-- Debug votes table issues

-- Check if votes table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'votes'
ORDER BY ordinal_position;

-- Check for any constraints on the votes table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'votes'::regclass;

-- Check if there are any existing votes
SELECT COUNT(*) as vote_count FROM votes;

-- Check the most recent votes (if any)
SELECT * FROM votes ORDER BY created_at DESC LIMIT 5;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'votes';

-- Check RLS policies on votes table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'votes';
