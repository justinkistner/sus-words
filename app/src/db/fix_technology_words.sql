-- Simple approach: Add words to Technology category using UUID
-- First check what categories exist and their word counts
SELECT c.name as category, COUNT(w.id) as word_count 
FROM categories c
LEFT JOIN words w ON c.id = w.category_id
GROUP BY c.id, c.name 
ORDER BY word_count DESC;

-- Add more words to Technology category using UUID
DO $$
DECLARE
    tech_category_id UUID;
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
        (tech_category_id, 'Computer'),
        (tech_category_id, 'Monitor'),
        (tech_category_id, 'Keyboard'),
        (tech_category_id, 'Mouse'),
        (tech_category_id, 'Tablet'),
        (tech_category_id, 'Bluetooth'),
        (tech_category_id, 'WiFi')
        ON CONFLICT (category_id, word) DO NOTHING;
        
        RAISE NOTICE 'Added words to Technology category: %', tech_category_id;
    ELSE
        RAISE NOTICE 'Technology category not found';
    END IF;
END $$;

-- Verify Technology category now has enough words
SELECT c.name as category, COUNT(w.id) as word_count 
FROM categories c
LEFT JOIN words w ON c.id = w.category_id
WHERE c.name = 'Technology'
GROUP BY c.id, c.name;
