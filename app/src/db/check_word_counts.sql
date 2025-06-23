-- Check word counts by category to identify categories with insufficient words
SELECT category, COUNT(*) as word_count 
FROM words 
GROUP BY category 
ORDER BY word_count DESC;

-- Show which categories have less than 16 words (minimum needed for game)
SELECT category, COUNT(*) as word_count 
FROM words 
GROUP BY category 
HAVING COUNT(*) < 16
ORDER BY word_count DESC;

-- Add more words to Technology category if it's short
INSERT INTO words (category, word) VALUES
('Technology', 'Smartphone'),
('Technology', 'Laptop'),
('Technology', 'Internet'),
('Technology', 'Software'),
('Technology', 'Hardware'),
('Technology', 'Database'),
('Technology', 'Algorithm'),
('Technology', 'Programming'),
('Technology', 'Website'),
('Technology', 'Application'),
('Technology', 'Network'),
('Technology', 'Server'),
('Technology', 'Cloud'),
('Technology', 'Artificial Intelligence'),
('Technology', 'Machine Learning'),
('Technology', 'Blockchain'),
('Technology', 'Cybersecurity'),
('Technology', 'Virtual Reality'),
('Technology', 'Augmented Reality'),
('Technology', 'Robotics')
ON CONFLICT (category, word) DO NOTHING;

-- Verify Technology category now has enough words
SELECT category, COUNT(*) as word_count 
FROM words 
WHERE category = 'Technology'
GROUP BY category;
