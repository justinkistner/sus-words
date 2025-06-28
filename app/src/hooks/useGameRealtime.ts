import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GameRoom, Player, PlayerRole } from '@/types/game';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameRealtimeReturn {
  // Data state
  room: GameRoom | null;
  players: Player[];
  currentPlayerId: string | null;
  isFaker: boolean;
  secretWord: string | null;
  playerClues: { playerId: string; playerName: string; clue: string; submissionOrder?: number }[];
  playerVotes: { voterId: string; votedForId: string }[];
  fakerGuessResult: { guess: string | null; isCorrect: boolean } | null;
  
  // Turn-based state
  currentTurnPlayerId: string | null;
  turnStartedAt: string | null;
  buttonHolderIndex: number | null;
  
  // Ready state
  playersReadyForClues: { playerId: string; playerName: string; isReady: boolean }[];
  allPlayersReady: boolean;
  currentPlayerReady: boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: string;
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  submitClue: (clueText: string) => Promise<{ success: boolean; error?: string }>;
  submitVote: (votedForId: string) => Promise<{ success: boolean; error?: string }>;
  refreshConnection: () => void;
}

// Helper function to normalize room data from database (snake_case) to our types (camelCase)
const normalizeRoomData = (roomData: any): GameRoom => {
  return {
    id: roomData.id,
    name: roomData.name,
    hostId: roomData.host_id,
    createdAt: roomData.created_at,
    currentPhase: roomData.current_phase,
    currentRound: roomData.current_round,
    totalRounds: roomData.total_rounds,
    secretWord: roomData.secret_word,
    wordGrid: roomData.word_grid || [],
    category: roomData.category,
    timePerClue: roomData.time_per_clue,
    timePerVote: roomData.time_per_vote,
    gameMode: roomData.game_mode || 'classic',
    currentTurnPlayerId: roomData.current_turn_player_id,
    turnStartedAt: roomData.turn_started_at,
    buttonHolderIndex: roomData.button_holder_index,
    players: []
  };
};

export function useGameRealtime(roomId: string): UseGameRealtimeReturn {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionTrigger, setSubscriptionTrigger] = useState(0); // Add trigger to force re-subscription
  
  // Check initial player ID on mount
  useEffect(() => {
    const storedId = localStorage.getItem('playerId');
    const storedName = localStorage.getItem('playerName');
    console.log('useGameRealtime MOUNT - Initial player data:', {
      playerId: storedId,
      playerName: storedName,
      roomId
    });
  }, []);
  
  // Data state
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isFaker, setIsFaker] = useState(false);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [playerClues, setPlayerClues] = useState<{ playerId: string; playerName: string; clue: string; submissionOrder?: number }[]>([]);
  const [playerVotes, setPlayerVotes] = useState<{ voterId: string; votedForId: string }[]>([]);
  const [fakerGuessResult, setFakerGuessResult] = useState<{ guess: string | null; isCorrect: boolean } | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [turnStartedAt, setTurnStartedAt] = useState<string | null>(null);
  const [buttonHolderIndex, setButtonHolderIndex] = useState<number | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Debug when currentPlayerId changes
  useEffect(() => {
    console.log('useGameRealtime: currentPlayerId state changed to:', currentPlayerId);
  }, [currentPlayerId]);
  
  // Fetch room data
  const fetchRoomData = useCallback(async () => {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      
      const normalizedRoom = normalizeRoomData(roomData);
      setRoom(normalizedRoom);
      setCurrentTurnPlayerId(normalizedRoom.currentTurnPlayerId ?? null);
      setTurnStartedAt(normalizedRoom.turnStartedAt ?? null);
      setButtonHolderIndex(normalizedRoom.buttonHolderIndex ?? null);
      
      // Only fetch round data if we're in an active game phase
      if (normalizedRoom.currentPhase !== 'waiting' && normalizedRoom.currentRound > 0) {
        const { data: roundData, error: roundError } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('room_id', roomId)
          .eq('round_number', normalizedRoom.currentRound)
          .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

        if (roundError && roundError.code !== 'PGRST116') {
          console.error('Error fetching round data:', roundError);
        }
        
        if (roundData) {
          const playerId = localStorage.getItem('playerId');
          setIsFaker(roundData.faker_id === playerId);
          
          // Show secret word to all players during results phase, otherwise only non-fakers
          if (normalizedRoom.currentPhase === 'results' || roundData.faker_id !== playerId) {
            setSecretWord(String(roundData.secret_word || '') || null);
          } else {
            // Clear secret word for faker
            setSecretWord(null);
          }
          
          // Check if faker made a guess
          if (roundData.faker_guess) {
            setFakerGuessResult({
              guess: String(roundData.faker_guess),
              isCorrect: String(roundData.faker_guess).toLowerCase() === String(roundData.secret_word || '').toLowerCase()
            });
          } else {
            // Clear faker guess result for new rounds
            setFakerGuessResult(null);
          }
        } else {
          // No round data yet - clear everything
          setIsFaker(false);
          setSecretWord(null);
          setFakerGuessResult(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching room data:', err);
      setError(err.message || 'Failed to load room data');
    }
  }, [roomId, supabase]);
  
  // Fetch players data
  const fetchPlayersData = useCallback(async () => {
    try {
      const { data: roomPlayers, error: playersError } = await supabase
        .from('room_players')
        .select(`
          player_id,
          is_host,
          is_ready,
          is_ready_for_clues,
          score,
          role,
          players (
            id,
            name
          )
        `)
        .eq('room_id', roomId);
        
      if (playersError) throw playersError;
      
      if (roomPlayers) {
        const formattedPlayers: Player[] = roomPlayers.map(rp => ({
          id: rp.player_id as string,
          name: (rp.players as any)?.name || 'Unknown',
          role: (rp.role || 'regular') as PlayerRole,
          score: (rp.score as number) || 0,
          isReady: (rp.is_ready as boolean) || false,
          isHost: (rp.is_host as boolean) || false,
          isReadyForClues: (rp.is_ready_for_clues as boolean) || false
        }));
        
        setPlayers(formattedPlayers);
        
        // Set current player ID
        const currentId = localStorage.getItem('playerId');
        const storedPlayerName = localStorage.getItem('playerName');
        
        console.log('useGameRealtime Player ID Debug:', {
          currentIdFromStorage: currentId,
          storedPlayerName,
          playersInRoom: formattedPlayers.map(p => ({ id: p.id, name: p.name })),
          matchFound: formattedPlayers.some(p => p.id === currentId),
          timestamp: new Date().toISOString()
        });
        
        if (currentId && formattedPlayers.some(p => p.id === currentId)) {
          // Player ID exists and matches a player in the room
          setCurrentPlayerId(currentId);
        } else if (storedPlayerName) {
          // Try to reconnect by player name
          const matchingPlayer = formattedPlayers.find(p => p.name === storedPlayerName);
          if (matchingPlayer) {
            console.log('Reconnecting player by name:', storedPlayerName, 'with ID:', matchingPlayer.id);
            localStorage.setItem('playerId', matchingPlayer.id);
            setCurrentPlayerId(matchingPlayer.id);
          } else {
            console.error('Could not find player with name:', storedPlayerName);
          }
        } else {
          console.error('No player ID or name found in localStorage!');
        }
      }
    } catch (err: any) {
      console.error('Error fetching players:', err);
      setError(err.message || 'Failed to load players');
    }
  }, [roomId, supabase]);
  
  // Fetch clues for current round
  const fetchCluesData = useCallback(async () => {
    if (!room || room.currentPhase !== 'clueGiving' && room.currentPhase !== 'voting' && room.currentPhase !== 'results' && room.currentPhase !== 'fakerGuess') return;
    
    try {
      const { data: clues, error } = await supabase
        .from('clues')
        .select(`
          clue_text,
          player_id,
          submission_order,
          players (
            name
          )
        `)
        .eq('room_id', roomId)
        .eq('round_number', room.currentRound);
        
      if (error) throw error;
      
      console.log('Raw clues data from database:', clues);
      
      if (clues) {
        const formattedClues = clues.map((c: any) => ({
          playerId: c.player_id,
          playerName: c.players.name,
          clue: c.clue_text,
          submissionOrder: c.submission_order
        }));
        console.log('Formatted clues:', formattedClues);
        setPlayerClues(formattedClues);
      }
    } catch (err: any) {
      console.error('Error fetching clues:', err);
    }
  }, [room, roomId, supabase]);
  
  // Fetch votes for the current round
  const fetchVotesData = useCallback(async () => {
    if (!room?.currentRound) return;
    
    console.log('Fetching votes for round:', room.currentRound);
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id, voted_for_id')
      .eq('room_id', roomId)
      .eq('round_number', room.currentRound);
      
    if (!votesError && votes) {
      console.log('Votes fetched:', votes.length);
      setPlayerVotes(votes.map(v => ({
        voterId: v.voter_id as string,
        votedForId: v.voted_for_id as string
      })));
    } else if (votesError) {
      console.error('Error fetching votes:', votesError);
    }
  }, [roomId, room?.currentRound, supabase]);
  
  // Combined refresh function
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchRoomData(),
      fetchPlayersData()
    ]);
    
    // Fetch clues if in clue-giving phase or later
    if (room?.currentPhase === 'clueGiving' || room?.currentPhase === 'voting' || room?.currentPhase === 'results') {
      await fetchCluesData();
    }
    
    // Fetch votes if in voting or results phase
    if (room?.currentPhase === 'voting' || room?.currentPhase === 'results' || room?.currentPhase === 'fakerGuess') {
      await fetchVotesData();
    }
    
    setIsLoading(false);
  }, [fetchRoomData, fetchPlayersData, fetchCluesData, fetchVotesData, room?.currentPhase]);
  
  // Submit clue function
  const submitClue = useCallback(async (clueText: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentPlayerId || !room) {
      return { success: false, error: 'Not connected to game' };
    }
    
    const { submitClue } = await import('@/lib/gameActions');
    return submitClue(roomId, currentPlayerId, clueText, room.currentRound);
  }, [currentPlayerId, room, roomId]);

  // Submit a vote
  const submitVoteAction = useCallback(async (votedForId: string): Promise<{ success: boolean; error?: string }> => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || !room) {
      return { success: false, error: 'Not authenticated or room not loaded' };
    }
    
    console.log('Submitting vote:', {
      roomId,
      playerId,
      votedForId,
      roundNumber: room.currentRound
    });
    
    const { submitVote } = await import('@/lib/gameActions');
    const result = await submitVote(roomId, playerId, votedForId, room.currentRound);
    
    console.log('Vote submission result:', result);
    
    return result;
  }, [roomId, room]);
  
  // Set up realtime subscriptions
  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      router.push('/');
      return;
    }
    
    setCurrentPlayerId(playerId);
    
    // Initial data fetch
    refreshData();
    
    // Clean up any existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    // Create new channel
    const channel = supabase.channel(`game:${roomId}`);
    channelRef.current = channel;
    
    // Set up event handlers BEFORE subscribing
    
    // Handle room changes
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      async (payload) => {
        console.log('🎮 Room update received:', payload);
        const normalizedRoom = normalizeRoomData(payload.new);
        setRoom(normalizedRoom);
        setCurrentTurnPlayerId(normalizedRoom.currentTurnPlayerId ?? null);
        setTurnStartedAt(normalizedRoom.turnStartedAt ?? null);
        setButtonHolderIndex(normalizedRoom.buttonHolderIndex ?? null);
        
        // Check if round changed
        const oldRound = room?.currentRound || 0;
        const newRound = normalizedRoom.currentRound;
        
        if (oldRound !== newRound) {
          console.log(`📍 Round changed from ${oldRound} to ${newRound}`);
          // Clear round-specific state
          setPlayerClues([]);
          setPlayerVotes([]);
          setFakerGuessResult(null);
        }
        
        // If phase changed or round changed, refresh all data
        if (normalizedRoom.currentPhase !== 'waiting') {
          await fetchRoomData();
          await fetchPlayersData();
          await fetchCluesData();
          await fetchVotesData();
        }
        
        // Check for game end
        if (normalizedRoom.currentPhase === 'gameOver') {
          console.log('Game ended');
        }
      }
    );
    
    // Handle player changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      },
      async () => {
        console.log('👥 Players update received');
        await fetchPlayersData();
      }
    );
    
    // Handle clue changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clues',
        filter: `room_id=eq.${roomId}`
      },
      async () => {
        console.log('💬 Clues update received');
        await fetchCluesData();
      }
    );
    
    // Handle vote changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        console.log('🗳️ Votes update received:', payload);
        
        // Directly fetch and update votes to avoid stale closure issues
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('voter_id, voted_for_id')
          .eq('room_id', roomId)
          .eq('round_number', room?.currentRound || 1);
          
        if (!votesError && votes) {
          console.log('Real-time votes fetched:', votes.length);
          setPlayerVotes(votes.map(v => ({
            voterId: v.voter_id as string,
            votedForId: v.voted_for_id as string
          })));
        } else if (votesError) {
          console.error('Error fetching votes in real-time:', votesError);
        }
      }
    );
    
    // Subscribe to the channel
    console.log('Subscribing to game channel...');
    channel.subscribe((status) => {
      console.log('Game channel status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to game channel');
        setIsConnected(true);
        setConnectionError(null);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Failed to subscribe to game channel');
        setIsConnected(false);
        setConnectionError('Failed to connect to game updates');
      } else if (status === 'CLOSED') {
        console.log('Channel closed');
        setIsConnected(false);
      }
    });
    
    // Cleanup function
    return () => {
      console.log('Cleaning up game realtime subscription');
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [roomId, subscriptionTrigger]); // Only depend on stable values
  
  // Separate effect for clue fetching when phase changes
  useEffect(() => {
    if (room?.currentPhase === 'clueGiving' || room?.currentPhase === 'voting' || room?.currentPhase === 'results' || room?.currentPhase === 'fakerGuess') {
      fetchCluesData();
    }
  }, [room?.currentPhase, fetchCluesData]);
  
  // Separate effect for vote fetching when phase changes
  useEffect(() => {
    if (room?.currentPhase === 'voting' || room?.currentPhase === 'results') {
      fetchVotesData();
    }
  }, [room?.currentPhase, fetchVotesData]);
  
  useEffect(() => {
    // Redirect to home when game is ended prematurely by host
    if (room?.currentPhase === 'ended') {
      router.push('/');
    }
  }, [room?.currentPhase, router]);

  useEffect(() => {
    // Remove automatic redirect when game finishes
    // Players should be able to view the final score screen
  }, [room?.currentPhase, router]);

  const refreshConnection = useCallback(() => {
    console.log('Refreshing connection...');
    
    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    // Reset connection state
    setIsConnected(false);
    setConnectionError(null);
    
    // Re-fetch all data
    fetchRoomData();
    
    // Trigger re-subscription
    setSubscriptionTrigger(subscriptionTrigger + 1);
  }, [fetchRoomData, subscriptionTrigger]);

  return {
    // Data state
    room,
    players,
    currentPlayerId,
    isFaker,
    secretWord,
    playerClues,
    playerVotes,
    fakerGuessResult,
    currentTurnPlayerId,
    turnStartedAt,
    buttonHolderIndex,
    
    // Ready state
    playersReadyForClues: players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      isReady: p.isReadyForClues || false
    })),
    allPlayersReady: players.length > 0 && players.every(p => p.isReadyForClues),
    currentPlayerReady: players.find(p => p.id === currentPlayerId)?.isReadyForClues || false,
    
    // Loading and error states
    isLoading,
    error,
    isConnected,
    connectionError,
    
    // Actions
    refreshData,
    submitClue,
    submitVote: submitVoteAction,
    refreshConnection
  };
}
