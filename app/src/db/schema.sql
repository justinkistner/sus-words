-- Sus Word Game Database Schema

-- Rooms table: Stores information about game rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_phase TEXT NOT NULL DEFAULT 'lobby',
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 3,
  secret_word TEXT,
  category TEXT,
  time_per_clue INTEGER,
  time_per_vote INTEGER,
  game_mode TEXT NOT NULL DEFAULT 'classic',
  word_grid JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Players table: Stores information about players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room players junction table: Tracks which players are in which rooms
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'regular',
  score INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

-- Clues table: Stores clues given by players in each round
CREATE TABLE clues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  clue_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_id, round_number)
);

-- Votes table: Stores votes cast by players in each round
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  voted_for_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, voter_id, round_number)
);

-- Game rounds table: Stores information about each round
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  secret_word TEXT NOT NULL,
  faker_id UUID REFERENCES players(id),
  double_agent_id UUID REFERENCES players(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, round_number)
);

-- Categories table: Stores word categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Words table: Stores words for each category
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, word)
);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (to be expanded)
-- Allow authenticated users to see all rooms
CREATE POLICY "Rooms are viewable by all authenticated users" 
  ON rooms FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow players to see other players in their rooms
CREATE POLICY "Room players are viewable by players in the same room" 
  ON room_players FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = room_players.room_id 
    AND rp.player_id = auth.uid()
  ));

-- Allow players to see clues in their rooms
CREATE POLICY "Clues are viewable by players in the same room" 
  ON clues FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = clues.room_id 
    AND rp.player_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_room_players_room_id ON room_players(room_id);
CREATE INDEX idx_clues_room_id ON clues(room_id);
CREATE INDEX idx_votes_room_id ON votes(room_id);
CREATE INDEX idx_game_rounds_room_id ON game_rounds(room_id);
CREATE INDEX idx_words_category_id ON words(category_id);
