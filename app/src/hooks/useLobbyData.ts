import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Player, GameRoom, PlayerRole } from '@/types/game';

interface UseLobbyDataReturn {
  room: GameRoom | null;
  players: Player[];
  isLoading: boolean;
  error: string | null;
  isHost: boolean;
  isReady: boolean;
  // State setters for external updates
  setRoom: (room: GameRoom | null) => void;
  setIsHost: (isHost: boolean) => void;
  setIsReady: (isReady: boolean) => void;
  // Player management functions
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  // Data refresh function
  refreshData: () => Promise<void>;
}

/**
 * React hook for managing lobby data state.
 * Handles initial data fetching and provides functions for incremental updates.
 */
export function useLobbyData(roomId: string): UseLobbyDataReturn {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Helper function to normalize room data from database (snake_case) to our types (camelCase)
  const normalizeRoomData = useCallback((roomData: any): GameRoom => {
    return {
      id: roomData.id,
      name: roomData.name,
      hostId: roomData.host_id,
      createdAt: roomData.created_at,
      currentPhase: roomData.current_phase,
      currentRound: roomData.current_round,
      totalRounds: roomData.total_rounds,
      secretWord: roomData.secret_word,
      wordGrid: roomData.word_grid,
      category: roomData.category,
      timePerClue: roomData.time_per_clue,
      timePerVote: roomData.time_per_vote,
      gameMode: roomData.game_mode || 'classic',
      players: []
    };
  }, []);

  // Initial data fetch function
  const fetchInitialData = useCallback(async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      setError('No player ID found');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const supabase = createClient();

      // Get room data
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('Room fetch error:', roomError);
        throw new Error(`Failed to fetch room: ${roomError.message}`);
      }

      if (!roomData) {
        throw new Error('Room not found');
      }

      const normalizedRoom = normalizeRoomData(roomData);
      setRoom(normalizedRoom);

      // Get players in the room
      const { data: roomPlayers, error: playersError } = await supabase
        .from('room_players')
        .select(`
          player_id,
          is_host,
          is_ready,
          score,
          players (
            id,
            name
          )
        `)
        .eq('room_id', roomId);

      if (playersError) {
        console.error('Players fetch error:', playersError);
        throw new Error(`Failed to fetch players: ${playersError.message}`);
      }

      if (!roomPlayers) {
        console.warn('No players found for room');
        setPlayers([]);
      } else {
        const formattedPlayers = roomPlayers.map((rp: any) => ({
          id: rp.player_id,
          name: rp.players?.name || 'Unknown Player',
          isHost: Boolean(rp.is_host),
          isReady: Boolean(rp.is_ready),
          score: rp.score || 0,
          role: 'regular' as PlayerRole // Default role
        }));

        setPlayers(formattedPlayers);

        // Check if current player is host and ready
        const currentPlayerData = roomPlayers.find((p: any) => p.player_id === playerId);
        if (currentPlayerData) {
          setIsHost(Boolean(currentPlayerData.is_host));
          setIsReady(Boolean(currentPlayerData.is_ready));
        }
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error fetching lobby data:', err);
      setError(err.message || 'Failed to load lobby data');
      setIsLoading(false);
    }
  }, [roomId, normalizeRoomData]);

  // Player management functions
  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, ...updates } : player
    ));
  }, []);

  const addPlayer = useCallback((player: Player) => {
    setPlayers(prev => {
      // Check if player already exists
      const exists = prev.some(p => p.id === player.id);
      if (exists) {
        console.warn(`Player ${player.id} already exists, updating instead`);
        return prev.map(p => p.id === player.id ? player : p);
      }
      return [...prev, player];
    });
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    console.log('🗑️ removePlayer called for:', playerId);
    setPlayers(prev => {
      const filtered = prev.filter(player => player.id !== playerId);
      console.log('Players before filter:', prev.map(p => p.id));
      console.log('Players after filter:', filtered.map(p => p.id));
      return filtered;
    });
  }, []);

  // Refresh data function (for manual refresh)
  const refreshData = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  // Initial data fetch on mount or roomId change
  useEffect(() => {
    if (roomId) {
      fetchInitialData();
    }
  }, [roomId, fetchInitialData]);

  return {
    room,
    players,
    isLoading,
    error,
    isHost,
    isReady,
    setRoom,
    setIsHost,
    setIsReady,
    updatePlayer,
    addPlayer,
    removePlayer,
    refreshData
  };
}
