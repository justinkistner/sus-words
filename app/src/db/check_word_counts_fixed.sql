-- Check the actual schema first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'words' 
ORDER BY ordinal_position;

-- Check word counts by category using the correct schema
SELECT c.name as category, COUNT(w.id) as word_count 
FROM categories c
LEFT JOIN words w ON c.id = w.category_id
GROUP BY c.id, c.name 
ORDER BY word_count DESC;

-- Show which categories have less than 16 words (minimum needed for game)
SELECT c.name as category, COUNT(w.id) as word_count 
FROM categories c
LEFT JOIN words w ON c.id = w.category_id
GROUP BY c.id, c.name 
HAVING COUNT(w.id) < 16
ORDER BY word_count DESC;

-- Get the Technology category ID
SELECT id, name FROM categories WHERE name = 'Technology';

-- Add more words to Technology category (assuming category_id = 1, adjust if needed)
-- First, let's see what the actual Technology category ID is
DO $$
DECLARE
    tech_category_id INTEGER;
BEGIN
    SELECT id INTO tech_category_id FROM categories WHERE name = 'Technology';
    
    IF tech_category_id IS NOT NULL THEN
        INSERT INTO words (category_id, word) VALUES
        (tech_category_id, 'Smartphone'),
        (tech_category_id, 'Laptop'),
        (tech_category_id, 'Internet'),
        (tech_category_id, 'Software'),
        (tech_category_id, 'Hardware'),
        (tech_category_id, 'Database'),
        (tech_category_id, 'Algorithm'),
        (tech_category_id, 'Programming'),
        (tech_category_id, 'Website'),
        (tech_category_id, 'Application'),
        (tech_category_id, 'Network'),
        (tech_category_id, 'Server'),
        (tech_category_id, 'Cloud'),
        (tech_category_id, 'Artificial Intelligence'),
        (tech_category_id, 'Machine Learning'),
        (tech_category_id, 'Blockchain'),
        (tech_category_id, 'Cybersecurity'),
        (tech_category_id, 'Virtual Reality'),
        (tech_category_id, 'Augmented Reality'),
        (tech_category_id, 'Robotics')
        ON CONFLICT (category_id, word) DO NOTHING;
    END IF;
END $$;

-- Verify Technology category now has enough words
SELECT c.name as category, COUNT(w.id) as word_count 
FROM categories c
LEFT JOIN words w ON c.id = w.category_id
WHERE c.name = 'Technology'
GROUP BY c.id, c.name;
