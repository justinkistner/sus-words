-- Check how many categories are available in the database
SELECT id, name FROM categories ORDER BY name;

-- Also check word counts per category
SELECT c.name as category, COUNT(w.id) as word_count 
FROM categories c
LEFT JOIN words w ON c.id = w.category_id
GROUP BY c.id, c.name
ORDER BY c.name;
