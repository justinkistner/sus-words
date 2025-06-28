'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useLobbyRealtime } from '@/hooks/useLobbyRealtime';
import { leaveGame, initializeTurnOrder } from '@/lib/gameActions';
import Image from 'next/image';

export default function Lobby() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  
  // Local state for UI interactions
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [shouldNavigateHome, setShouldNavigateHome] = useState(false);

  // Use the new combined hook for lobby data and realtime
  const {
    room,
    players,
    isLoading,
    error,
    isHost,
    isReady,
    isConnected,
    connectionError,
    setIsReady,
    refreshData
  } = useLobbyRealtime(roomId);

  const supabase = createClient();

  // Handle navigation after leaving game to avoid React Router warning
  useEffect(() => {
    if (shouldNavigateHome) {
      router.push('/');
    }
  }, [shouldNavigateHome, router]);

  // Redirect if no player ID (moved to useEffect to avoid setState during render)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const playerId = localStorage.getItem('playerId');
      if (!playerId) {
        // Redirect leaving players smoothly to home page
        router.push('/');
      }
    }
  }, [router]);

  const toggleReady = async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) return;

    try {
      const { error } = await supabase
        .from('room_players')
        .update({ is_ready: !isReady })
        .eq('room_id', roomId)
        .eq('player_id', playerId);

      if (error) throw error;
      setIsReady(!isReady);
    } catch (err: any) {
      console.error('Error toggling ready status:', err);
    }
  };

  const startGame = async () => {
    if (!isHost || isStartingGame) return;
    
    console.log('Starting game...');
    setIsStartingGame(true);
    
    // Check if all players are ready
    const allReady = players.every(p => p.isReady);
    if (!allReady) {
      console.error('All players must be ready to start the game');
      setIsStartingGame(false);
      return;
    }

    if (players.length < 3) {
      console.error('Need at least 3 players to start the game');
      setIsStartingGame(false);
      return;
    }

    try {
      console.log('Fetching categories...');
      // Get all categories
      const { data: allCategories, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
        
      if (categoriesError) throw categoriesError;
      
      if (!allCategories || allCategories.length === 0) {
        throw new Error('No categories available');
      }
      
      console.log(`Found ${allCategories.length} categories`);
      
      // Pick a random category
      const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
      console.log('Selected category:', randomCategory.name);

      // Fetch words for the selected category
      console.log('Fetching words for category...');
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select('word')
        .eq('category_id', randomCategory.id as number);

      if (wordsError) throw wordsError;

      if (words.length < 16) {
        throw new Error('Not enough words in the selected category');
      }

      console.log(`Found ${words.length} words, selecting 16 for grid`);

      // Shuffle and select 16 words for the grid
      const shuffledWords = words.sort(() => 0.5 - Math.random());
      const selectedWords = shuffledWords.slice(0, 16).map(w => w.word);

      // Pick a random secret word from the grid
      const secretWord = selectedWords[Math.floor(Math.random() * selectedWords.length)];
      console.log('Secret word selected:', secretWord);

      // Randomly assign one player as the faker
      const randomPlayerIndex = Math.floor(Math.random() * players.length);
      const fakerId = players[randomPlayerIndex].id;
      console.log('Faker assigned:', players[randomPlayerIndex].name);

      // Update the room to start the game with wordReveal phase first
      console.log('Updating room to start game with wordReveal phase...');
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          current_phase: 'wordReveal',
          word_grid: selectedWords,
          secret_word: secretWord,
          category: randomCategory.name,
          current_round: 1,
          button_holder_index: 0,
          current_turn_player_id: players[0].id, // First player goes first
          turn_started_at: new Date().toISOString()
        })
        .eq('id', roomId);

      if (updateError) throw updateError;

      // Create game_rounds entry
      console.log('Creating game round entry...');
      const { error: roundError } = await supabase
        .from('game_rounds')
        .insert({
          room_id: roomId,
          round_number: 1,
          secret_word: secretWord,
          faker_id: fakerId
        });

      if (roundError) throw roundError;

      // Update room_players to set the faker role
      console.log('Setting player roles...');
      
      // First, reset all players to regular and clear ready state
      const { error: resetError } = await supabase
        .from('room_players')
        .update({ 
          role: 'regular',
          is_ready_for_clues: false
        })
        .eq('room_id', roomId);
        
      if (resetError) throw resetError;
      
      // Then set the faker
      const { error: fakerError } = await supabase
        .from('room_players')
        .update({ role: 'faker' })
        .eq('room_id', roomId)
        .eq('player_id', fakerId);
        
      if (fakerError) throw fakerError;

      // Initialize turn order for the game
      console.log('Initializing turn order...');
      const { error: turnOrderError } = await initializeTurnOrder(roomId);
      
      if (turnOrderError) {
        console.error('Error initializing turn order:', turnOrderError);
        throw new Error(turnOrderError);
      }

      console.log('Game started successfully with wordReveal phase');
      console.log('Players will use the Ready button to proceed to clue giving phase');
    } catch (err: any) {
      console.error('Error starting game:', err);
      setIsStartingGame(false);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join?room=${roomId}`;
    navigator.clipboard.writeText(`Join my Sus Word game!\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleLeaveGame = async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || isLeaving) return;
    
    setIsLeaving(true);
    const result = await leaveGame(roomId, playerId);
    
    if (result.success) {
      // Use state flag to trigger navigation in useEffect
      setShouldNavigateHome(true);
    } else {
      alert(result.error || 'Failed to leave game');
      setIsLeaving(false);
    }
  };

  const handleToggleReady = async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) return;

    const newReadyStatus = !isReady;
    console.log('Toggling ready status to:', newReadyStatus);
    
    const { error } = await supabase
      .from('room_players')
      .update({ is_ready: newReadyStatus })
      .eq('room_id', params.id as string)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error updating ready status:', error);
    } else {
      console.log('Ready status updated successfully');
      setIsReady(newReadyStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4">Loading lobby...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-6 rounded-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="relative flex items-center justify-between mb-6 pb-6">
            {/* Logo */}
            <div className="flex items-center">
              <Image 
                src="/sus-words-logo.png" 
                alt="Sus Words Logo" 
                width={48} 
                height={48}
                className="mr-3"
              />
            </div>
            
            {/* Room Name - Absolutely centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                {room?.name || 'Game Lobby'}
              </h1>
              <div className="text-xs text-slate-400 uppercase tracking-wide mt-1">
                ROOM
              </div>
            </div>
            
            {/* Status message for non-hosts or Start Game button for host */}
            <div className="text-right">
              {isHost ? (
                <button
                  onClick={startGame}
                  disabled={isStartingGame || players.length < 3 || !players.every(p => p.isReady)}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    (isStartingGame || players.length < 3 || !players.every(p => p.isReady))
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isStartingGame ? 'Starting...' : 'Start Game'}
                </button>
              ) : (
                <div className="text-sm text-slate-400 text-right max-w-24">
                  Waiting for host to start
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-slate-300">Players</h2>
                <button
                  onClick={copyInviteLink}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-sm transition-colors flex items-center"
                >
                  {copied ? 'Copied!' : 'Copy Invite'}
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-3">Mark yourself as ready when you are ready.</p>
              <div className="bg-slate-700/50 rounded-lg p-4">
                {players.length === 0 ? (
                  <p className="text-slate-400 text-center">No players have joined yet</p>
                ) : (
                  <ul className="space-y-2">
                    {players.map((player) => {
                      const currentPlayerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null;
                      const isCurrentPlayer = player.id === currentPlayerId;
                      
                      return (
                        <li key={player.id} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                          <div className="flex items-center">
                            <span className="font-medium">
                              {isCurrentPlayer ? 'You' : player.name}
                            </span>
                            {player.isHost && (
                              <span className="ml-2 text-xs bg-indigo-600 px-2 py-0.5 rounded-full">Host</span>
                            )}
                          </div>
                          {isCurrentPlayer ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-300">
                                {isReady ? 'Ready' : 'Not Ready'}
                              </span>
                              <button
                                onClick={handleToggleReady}
                                className="relative inline-flex h-6 w-12 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                              >
                                <span className="sr-only">Toggle ready status</span>
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full transition-all ${
                                    isReady 
                                      ? 'translate-x-7 bg-green-600' 
                                      : 'translate-x-1 bg-red-600'
                                  }`}
                                />
                              </button>
                            </div>
                          ) : (
                            <div className={`w-3 h-3 rounded-full ${player.isReady ? 'bg-green-600' : 'bg-red-600'}`}></div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-300 mb-3">Game Settings</h2>
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Game Mode:</span>
                  <span className="font-medium capitalize">{room?.gameMode || 'Classic'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rounds:</span>
                  <span className="font-medium">{room?.totalRounds || 3}</span>
                </div>
                {isHost && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <h3 className="text-sm font-medium mb-2 text-slate-300">Host Controls</h3>
                    <p className="text-xs text-slate-400 mb-2">
                      All players must be ready to start the game. You need at least 3 players.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleLeaveGame}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Leave Game
            </button>
          </div>

          {(error || connectionError) && (
            <div className="mt-4 bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
              {error && <div>Data Error: {error}</div>}
              {connectionError && <div>Connection Error: {connectionError.message}</div>}
              {!isConnected && <div>Disconnected from server. Attempting to reconnect...</div>}
            </div>
          )}

          <div className="mt-4 text-sm text-gray-400">
            Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
      </div>
    </div>
  );
}
