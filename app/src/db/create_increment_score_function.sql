-- Create a function to increment player scores
CREATE OR REPLACE FUNCTION increment_player_score(
  p_room_id UUID,
  p_player_id UUID,
  p_points INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE room_players
  SET score = COALESCE(score, 0) + p_points
  WHERE room_id = p_room_id
  AND player_id = p_player_id;
END;
$$ LANGUAGE plpgsql;
