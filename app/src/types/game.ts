// Game-related type definitions

export type GameMode = 'classic' | 'doubleAgent' | 'silent' | 'reverse' | 'timeBomb' | 'decoyWord' | 'truthOrTrap' | 'themeChaos' | 'drawing' | 'hotSeat' | 'audience';

export type PlayerRole = 'faker' | 'regular' | 'doubleAgent' | 'observer';

export type GamePhase = 'waiting' | 'lobby' | 'wordReveal' | 'clueGiving' | 'voting' | 'fakerGuess' | 'results' | 'gameOver' | 'finished' | 'ended';

export type Player = {
  id: string;
  name: string;
  role: PlayerRole;
  score: number;
  isReady: boolean;
  isHost: boolean;
  clue?: string;
  vote?: string; // ID of the player they voted for
};

export type GameRoom = {
  id: string;
  name: string;
  hostId: string;
  createdAt: string;
  currentPhase: GamePhase;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  secretWord?: string;
  wordGrid?: string[];
  category?: string;
  timePerClue?: number; // in seconds
  timePerVote?: number; // in seconds
  scores?: Record<string, number>;
  gameMode: GameMode;
};
