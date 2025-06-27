-- Seed data for Sus Word Game
-- This file contains initial categories and words for the game

-- Insert categories (overwrite if they already exist)
INSERT INTO categories (name) VALUES
  ('Animals'),
  ('Food'),
  ('Countries'),
  ('Sports'),
  ('Movies'),
  ('Professions')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- Insert words for Animals category
INSERT INTO words (category_id, word) 
SELECT id, word FROM 
  (SELECT id FROM categories WHERE name = 'Animals') AS c,
  (VALUES 
    ('Dog'),
    ('Cat'),
    ('Elephant'),
    ('Lion'),
    ('Tiger'),
    ('Bear'),
    ('Giraffe'),
    ('Monkey'),
    ('Zebra'),
    ('Penguin'),
    ('Kangaroo'),
    ('Koala'),
    ('Dolphin'),
    ('Shark'),
    ('Eagle'),
    ('Owl'),
    ('Snake'),
    ('Crocodile'),
    ('Frog'),
    ('Turtle')
  ) AS w(word)
ON CONFLICT (category_id, word) DO UPDATE SET word = EXCLUDED.word;

-- Insert words for Food category
INSERT INTO words (category_id, word) 
SELECT id, word FROM 
  (SELECT id FROM categories WHERE name = 'Food') AS c,
  (VALUES 
    ('Pizza'),
    ('Burger'),
    ('Pasta'),
    ('Sushi'),
    ('Taco'),
    ('Salad'),
    ('Steak'),
    ('Sandwich'),
    ('Pancake'),
    ('Ice Cream'),
    ('Chocolate'),
    ('Cookie'),
    ('Cake'),
    ('Bread'),
    ('Cheese'),
    ('Apple'),
    ('Banana'),
    ('Orange'),
    ('Strawberry'),
    ('Watermelon')
  ) AS w(word)
ON CONFLICT (category_id, word) DO UPDATE SET word = EXCLUDED.word;

-- Insert words for Countries category
INSERT INTO words (category_id, word) 
SELECT id, word FROM 
  (SELECT id FROM categories WHERE name = 'Countries') AS c,
  (VALUES 
    ('USA'),
    ('Canada'),
    ('Mexico'),
    ('Brazil'),
    ('Argentina'),
    ('UK'),
    ('France'),
    ('Germany'),
    ('Italy'),
    ('Spain'),
    ('China'),
    ('Japan'),
    ('India'),
    ('Australia'),
    ('Russia'),
    ('Egypt'),
    ('South Africa'),
    ('Nigeria'),
    ('Kenya'),
    ('Morocco')
  ) AS w(word)
ON CONFLICT (category_id, word) DO UPDATE SET word = EXCLUDED.word;

-- Insert words for Sports category
INSERT INTO words (category_id, word) 
SELECT id, word FROM 
  (SELECT id FROM categories WHERE name = 'Sports') AS c,
  (VALUES 
    ('Soccer'),
    ('Basketball'),
    ('Baseball'),
    ('Tennis'),
    ('Golf'),
    ('Swimming'),
    ('Volleyball'),
    ('Hockey'),
    ('Rugby'),
    ('Cricket'),
    ('Boxing'),
    ('Wrestling'),
    ('Skiing'),
    ('Snowboarding'),
    ('Surfing'),
    ('Cycling'),
    ('Running'),
    ('Gymnastics'),
    ('Archery'),
    ('Fencing')
  ) AS w(word)
ON CONFLICT (category_id, word) DO UPDATE SET word = EXCLUDED.word;

-- Insert words for Movies category
INSERT INTO words (category_id, word) 
SELECT id, word FROM 
  (SELECT id FROM categories WHERE name = 'Movies') AS c,
  (VALUES 
    ('Titanic'),
    ('Star Wars'),
    ('Avengers'),
    ('Jurassic Park'),
    ('Matrix'),
    ('Frozen'),
    ('Lion King'),
    ('Godfather'),
    ('Jaws'),
    ('E.T.'),
    ('Avatar'),
    ('Inception'),
    ('Toy Story'),
    ('Finding Nemo'),
    ('Shrek'),
    ('Batman'),
    ('Spider-Man'),
    ('Harry Potter'),
    ('Lord of the Rings'),
    ('Forrest Gump')
  ) AS w(word)
ON CONFLICT (category_id, word) DO UPDATE SET word = EXCLUDED.word;

-- Insert words for Professions category
INSERT INTO words (category_id, word) 
SELECT id, word FROM 
  (SELECT id FROM categories WHERE name = 'Professions') AS c,
  (VALUES 
    ('Doctor'),
    ('Teacher'),
    ('Engineer'),
    ('Lawyer'),
    ('Chef'),
    ('Pilot'),
    ('Firefighter'),
    ('Police Officer'),
    ('Nurse'),
    ('Scientist'),
    ('Artist'),
    ('Writer'),
    ('Musician'),
    ('Programmer'),
    ('Accountant'),
    ('Architect'),
    ('Electrician'),
    ('Plumber'),
    ('Farmer'),
    ('Journalist')
  ) AS w(word)
ON CONFLICT (category_id, word) DO UPDATE SET word = EXCLUDED.word;
