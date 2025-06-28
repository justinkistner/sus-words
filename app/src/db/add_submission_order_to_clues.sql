-- Add submission_order column to clues table if it doesn't exist
ALTER TABLE clues 
ADD COLUMN IF NOT EXISTS submission_order INTEGER;

-- Add submitted_at column if it doesn't exist
ALTER TABLE clues
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Update existing clues to have submission_order based on created_at
WITH ordered_clues AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY room_id, round_number ORDER BY created_at) as order_num
  FROM clues
)
UPDATE clues
SET submission_order = oc.order_num
FROM ordered_clues oc
WHERE clues.id = oc.id
AND clues.submission_order IS NULL;
