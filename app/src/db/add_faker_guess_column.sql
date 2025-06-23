-- Add faker_guess column to game_rounds table
ALTER TABLE game_rounds
ADD COLUMN faker_guess TEXT;
