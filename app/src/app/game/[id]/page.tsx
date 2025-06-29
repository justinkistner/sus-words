'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { GamePhase, Player } from '@/types/game';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { leaveGame, endGame, submitClue, submitVote, submitFakerGuess, startNextRound, viewFinalScores, restartGame } from '@/lib/gameActions';
import { Confetti } from '@/components/Confetti';
import ConnectionStatus from '@/components/ConnectionStatus';
import { Toast } from '@/components/Toast';
import { UnifiedRoleAssignment } from '@/components/UnifiedRoleAssignment';
import { UnifiedWaitingForPlayers } from '@/components/UnifiedWaitingForPlayers';
import { UnifiedTurnBasedClueGiving } from '@/components/UnifiedTurnBasedClueGiving';
import { UnifiedVotingPhase } from '@/components/UnifiedVotingPhase';
import { UnifiedResultsPhase } from '@/components/UnifiedResultsPhase';
import { UnifiedFakerGuessPhase } from '@/components/UnifiedFakerGuessPhase';

export default function Game() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  
  // Debug player identity
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedPlayerName = localStorage.getItem('playerName');
    console.log('GamePage Player Identity Debug:', {
      storedPlayerId,
      storedPlayerName,
      roomId,
      timestamp: new Date().toISOString()
    });
  }, [roomId]);
  
  // Use the new hook for all game state and realtime subscriptions
  const {
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
    playersReadyForClues,
    allPlayersReady,
    currentPlayerReady,
    isLoading,
    error,
    isConnected,
    connectionError,
    refreshData,
    submitClue,
    submitVote,
    refreshConnection
  } = useGameRealtime(roomId);
  
  // Debug current player recognition
  useEffect(() => {
    console.log('=== GAME PAGE DEBUG ===');
    console.log('Current Player ID:', currentPlayerId);
    console.log('Current Turn Player ID:', currentTurnPlayerId);
    console.log('Is My Turn:', currentPlayerId === currentTurnPlayerId);
    console.log('Players:', players.map(p => ({
      id: p.id,
      name: p.name,
      isMe: p.id === currentPlayerId
    })));
    console.log('======================');
  }, [currentPlayerId, currentTurnPlayerId, players]);
  
  // Local state for clue form
  const [clue, setClue] = useState<string>('');
  const [submittedClue, setSubmittedClue] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [fakerGuess, setFakerGuess] = useState<string>('');
  const [isStartingNextRound, setIsStartingNextRound] = useState(false);
  const [hasSubmittedVote, setHasSubmittedVote] = useState(false);
  const [hasRevealedRole, setHasRevealedRole] = useState(false);
  const [isSubmittingClue, setIsSubmittingClue] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  
  // Role visibility logic: primarily depend on hasRevealedRole to prevent spoilers during round transitions
  // Only show roles if explicitly revealed OR in specific non-transition phases
  const isRoleRevealed = hasRevealedRole || (room?.currentPhase === 'clueGiving' as GamePhase || room?.currentPhase === 'voting' as GamePhase || room?.currentPhase === 'fakerGuess' as GamePhase);
  
  // Track previous round to detect round changes
  const prevRoundRef = useRef<number | undefined>(undefined);
  const prevPhaseRef = useRef<GamePhase | undefined>(undefined);
  
  // Auto-transition to clueGiving when all players are ready
  useEffect(() => {
    if (room?.currentPhase === 'wordReveal' && allPlayersReady && players.length > 0) {
      console.log('🚀 All players ready! Auto-transitioning to clueGiving phase...');
      
      const transitionToClueGiving = async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('rooms')
            .update({ current_phase: 'clueGiving' })
            .eq('id', roomId);
            
          if (error) {
            console.error('Error transitioning to clueGiving:', error);
          } else {
            console.log('Successfully transitioned to clueGiving phase');
          }
        } catch (error) {
          console.error('Error in auto-transition:', error);
        }
      };
      
      // Small delay to let users see "All players ready!" message
      setTimeout(transitionToClueGiving, 1500);
    }
  }, [room?.currentPhase, allPlayersReady, players.length, roomId]);

  // Reset local state when round changes
  useEffect(() => {
    // Reset hasRevealedRole whenever we start a new round, regardless of phase
    if (prevRoundRef.current !== undefined && prevRoundRef.current !== room?.currentRound) {
      console.log('🔄 NEW ROUND DETECTED - Resetting hasRevealedRole to false');
      setHasRevealedRole(false);
    }
    
    // Only reset when we transition TO clueGiving from another phase
    if (room?.currentPhase === 'clueGiving' && prevPhaseRef.current !== 'clueGiving') {
      
      // Reset clue-related state for new phase
      setClue('');
      setSubmittedClue(false);
      setSelectedVote(null);
      setFakerGuess('');
      setHasSubmittedVote(false);
    }
    
    prevRoundRef.current = room?.currentRound;
    prevPhaseRef.current = room?.currentPhase;
  }, [room?.currentRound, room?.currentPhase]);

  // Listen for host reassignment and game reset events
  useEffect(() => {
    const handleHostReassigned = (event: CustomEvent) => {
      console.log('🎉 I am now the host!');
      setToastMessage('The previous host left. You are now the host!');
      setToastType('info');
      setShowToast(true);
    };

    const handleGameResetToLobby = () => {
      console.log('🔄 Game reset to lobby due to insufficient players');
      setToastMessage('Game ended due to insufficient players. Returning to lobby...');
      setToastType('info');
      setShowToast(true);
      // Redirect to lobby after showing the message
      setTimeout(() => {
        router.push(`/lobby/${roomId}`);
      }, 3000);
    };

    window.addEventListener('hostReassigned', handleHostReassigned as EventListener);
    window.addEventListener('gameResetToLobby', handleGameResetToLobby);

    return () => {
      window.removeEventListener('hostReassigned', handleHostReassigned as EventListener);
      window.removeEventListener('gameResetToLobby', handleGameResetToLobby);
    };
  }, [roomId, router]);

  const handleLeaveGame = async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || isLeaving) return;
    
    setIsLeaving(true);
    const result = await leaveGame(roomId, playerId);
    
    if (result.success) {
      // Clear local storage when leaving
      localStorage.removeItem('playerId');
      localStorage.removeItem('playerName');
      
      if (result.gameReset) {
        // Game was reset to lobby due to insufficient players
        setToastMessage('Game ended due to insufficient players. Returning to lobby.');
        setToastType('info');
        setShowToast(true);
        // Redirect to lobby instead of home
        setTimeout(() => router.push(`/lobby/${roomId}`), 2000);
      } else {
        // Normal leave - go to home
        router.push('/');
      }
    } else {
      setToastMessage(result.error || 'Failed to leave game');
      setToastType('error');
      setShowToast(true);
      setIsLeaving(false);
    }
  };

  const handleEndGame = async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || isEndingGame) return;
    
    if (!confirm('Are you sure you want to end the game for all players?')) {
      return;
    }
    
    setIsEndingGame(true);
    const result = await endGame(roomId, playerId);
    
    if (result.success) {
      setToastMessage('Game ended!');
      setToastType('success');
      setShowToast(true);
    } else {
      setToastMessage(result.error || 'Failed to end game');
      setToastType('error');
      setShowToast(true);
      setIsEndingGame(false);
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedVote || isSubmittingVote || hasSubmittedVote) return;
    
    setIsSubmittingVote(true);
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      setIsSubmittingVote(false);
      return;
    }
    
    console.log('Vote submission debug:', {
      voterId: playerId,
      votedForId: selectedVote,
      roundNumber: room?.currentRound || 1,
      availablePlayers: players.map(p => ({ id: p.id, name: p.name })),
      playerClues: playerClues.map(pc => ({ playerId: pc.playerId, playerName: pc.playerName }))
    });
    
    try {
      const result = await submitVote(selectedVote);
      
      if (result.success) {
        setHasSubmittedVote(true);
      } else {
        setToastMessage(`Error: ${result.error}`);
        setToastType('error');
        setShowToast(true);
        // Reset state on error so user can try again
        setSelectedVote(null);
      }
    } catch (error) {
      console.error('Vote submission error:', error);
      setToastMessage('Failed to submit vote. Please try again.');
      setToastType('error');
      setShowToast(true);
      // Reset state on error so user can try again
      setSelectedVote(null);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleClueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clue.trim() || isSubmittingClue || submittedClue) return;
    
    setIsSubmittingClue(true);
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      setIsSubmittingClue(false);
      return;
    }
    
    try {
      console.log('Submitting clue:', { clue });
      const result = await submitClue(clue);
      
      if (result.success) {
        setSubmittedClue(true);
      } else {
        setToastMessage(`Error: ${result.error}`);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Clue submission error:', error);
      setToastMessage('Failed to submit clue. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsSubmittingClue(false);
    }
  };

  const handleClueSubmitUnified = async (clueText: string) => {
    if (!clueText.trim() || isSubmittingClue || submittedClue) return;
    
    setIsSubmittingClue(true);
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      setIsSubmittingClue(false);
      return;
    }
    
    try {
      console.log('Submitting clue:', { clue: clueText });
      const result = await submitClue(clueText);
      
      if (result.success) {
        setSubmittedClue(true);
        setClue(''); // Clear the input after successful submission
      } else {
        setToastMessage(`Error: ${result.error}`);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Clue submission error:', error);
      setToastMessage('Failed to submit clue. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsSubmittingClue(false);
    }
  };

  // Check if current player has already submitted a clue
  const hasSubmittedClue = playerClues.some(pc => pc.playerId === currentPlayerId) || submittedClue;

  // Check if current player is the host
  const isHost = room?.hostId === currentPlayerId;

  // Check if current player has already voted
  const hasVoted = playerVotes.some(v => v.voterId === currentPlayerId) || hasSubmittedVote;

  const playerRoles = players.reduce((acc, player) => {
    acc[player.id] = player.role === 'faker' ? 'faker' : 'player';
    return acc;
  }, {} as Record<string, 'player' | 'faker'>);

  if (!currentPlayerId && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-xl sm:text-2xl font-bold mb-4">Establishing player identity...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-xl sm:text-2xl font-bold mb-4">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-xl sm:text-2xl font-bold mb-4 text-red-500">Error</div>
        <p className="text-gray-300 text-center px-4">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-xl sm:text-2xl font-bold mb-4">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 text-white p-4">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Connection status */}
        <ConnectionStatus isConnected={isConnected} connectionError={connectionError} onRetry={refreshConnection} />
        
        {/* Header */}
        <div className="grid grid-cols-3 items-center mb-6 gap-4">
          {/* Left: Game logo */}
          <div className="flex items-center justify-start">
            <Image 
              src="/sus-words-logo.png" 
              alt="Sus Words Logo" 
              width={48} 
              height={48}
              className="mr-3"
            />
          </div>
          
          {/* Center: Room name - truly centered */}
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">{room?.name || 'Loading...'}</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wide mt-1">ROOM</p>
          </div>
          
          {/* Right: Round counter or Next Round button */}
          <div className="flex justify-end">
            {/* Show round counter only when not in results phase */}
            {room?.currentPhase !== 'results' && (
              <p className="text-sm text-gray-400 text-right">
                Round {room?.currentRound || 0} of {room?.totalRounds || 3}
              </p>
            )}
            
            {/* Next Round Button (Results Phase Only) */}
            {room?.currentPhase === 'results' && (
              <>
                {isHost ? (
                  <>
                    {room?.currentRound < room?.totalRounds ? (
                      <button
                        onClick={async () => {
                          if (room?.currentRound >= room?.totalRounds) {
                            // Transition to finished phase
                            const supabase = createClient();
                            await supabase
                              .from('rooms')
                              .update({ current_phase: 'finished' })
                              .eq('id', roomId);
                            return;
                          }
                          
                          setIsStartingNextRound(true);
                          try {
                            const result = await startNextRound(roomId);
                            
                            if (!result.success) {
                              console.error('Failed to start next round:', result.error);
                              setToastMessage(`Failed to start next round: ${result.error || 'Unknown error'}`);
                              setToastType('error');
                              setShowToast(true);
                              setIsStartingNextRound(false);
                            } else {
                              // Reset local state for new round
                              setClue('');
                              setSubmittedClue(false);
                              setSelectedVote(null);
                              setFakerGuess('');
                              setHasSubmittedVote(false);
                              setIsStartingNextRound(false);
                            }
                          } catch (error) {
                            console.error('Error starting next round:', error);
                            setToastMessage(`Error starting next round: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            setToastType('error');
                            setShowToast(true);
                            setIsStartingNextRound(false);
                          }
                        }}
                        disabled={isStartingNextRound}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors text-sm"
                      >
                        {isStartingNextRound ? 'Starting...' : `Start round ${(room?.currentRound || 0) + 1} of ${room?.totalRounds || 1}`}
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const result = await viewFinalScores(roomId);
                          if (!result.success) {
                            setToastMessage(`Error: ${result.error}`);
                            setToastType('error');
                            setShowToast(true);
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors text-sm"
                      >
                        View Final Score
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-gray-300">
                      {room?.currentRound < room?.totalRounds ? (
                        <>Waiting for host to start round {(room?.currentRound || 0) + 1} of {room?.totalRounds || 1}...</>
                      ) : (
                        <>Waiting for host to reveal the final score...</>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Player Role Info / Voting / Results - Unified Container */}
        {(room?.currentPhase === 'wordReveal' || room?.currentPhase === 'clueGiving' || room?.currentPhase === 'voting' || room?.currentPhase === 'results' || room?.currentPhase === 'fakerGuess' || room?.currentPhase === 'finished') && currentPlayerId && (
          <div className="mb-8 p-6 bg-slate-700 rounded-lg transition-all duration-300 ease-in-out" style={{ minHeight: room?.currentPhase === 'voting' || room?.currentPhase === 'results' || room?.currentPhase === 'fakerGuess' || room?.currentPhase === 'finished' ? 'auto' : '180px' }}>
            {/* Word Reveal / Role Assignment Phase */}
            {room?.currentPhase === 'wordReveal' && (
              <>
                {!currentPlayerReady ? (
                  // Show role assignment if current player hasn't clicked Ready yet
                  <>
                    {console.log('🎮 RENDERING UnifiedRoleAssignment:', {
                      currentPhase: room?.currentPhase,
                      currentPlayerId,
                      isFaker,
                      hasRevealedRole: isRoleRevealed,
                      currentPlayerRole: isFaker ? 'faker' : 'player'
                    })}
                    <UnifiedRoleAssignment
                      currentPlayerId={currentPlayerId}
                      players={players}
                      turnOrder={[]}
                      buttonHolderIndex={buttonHolderIndex ?? 0}
                      currentPlayerRole={isFaker ? 'faker' : 'player'}
                      hasRevealedRole={isRoleRevealed}
                      roomId={roomId}
                      onRevealRole={() => {
                        console.log('🎯 ROLE REVEALED - Setting hasRevealedRole to true');
                        setHasRevealedRole(true);
                      }}
                    />
                  </>
                ) : (
                  // Show waiting UI if current player is ready but others aren't
                  <>
                    {console.log('🕐 RENDERING UnifiedWaitingForPlayers:', {
                      currentPhase: room?.currentPhase,
                      currentPlayerId,
                      currentPlayerReady,
                      allPlayersReady,
                      playersReadyForClues
                    })}
                    <UnifiedWaitingForPlayers
                      players={players}
                      currentPlayerId={currentPlayerId}
                      currentPlayerRole={isFaker ? 'faker' : 'player'}
                      playersReadyForClues={playersReadyForClues}
                      turnOrder={[]}
                      buttonHolderIndex={buttonHolderIndex ?? 0}
                    />
                  </>
                )}
              </>
            )}

            {/* Clue Giving Phase */}
            {room?.currentPhase === 'clueGiving' && (
              <UnifiedTurnBasedClueGiving
                currentPlayerId={currentPlayerId}
                isFaker={isFaker}
                secretWord={secretWord || undefined}
                currentTurnPlayerId={currentTurnPlayerId || ''}
                turnStartedAt={typeof turnStartedAt === 'string' ? parseInt(turnStartedAt) : turnStartedAt || Date.now()}
                buttonHolderIndex={buttonHolderIndex ?? 0}
                players={players}
                playerClues={playerClues}
                clue={clue}
                onClueChange={setClue}
                onClueSubmit={handleClueSubmitUnified}
                hasSubmittedClue={submittedClue}
                isSubmittingClue={isSubmittingClue}
                hasRevealedRole={isRoleRevealed}
                onRevealRole={() => setHasRevealedRole(true)}
                currentPlayerRole={isFaker ? 'faker' : 'player'}
              />
            )}

            {/* Voting Phase */}
            {room?.currentPhase === 'voting' && (
              <UnifiedVotingPhase
                currentPlayerId={currentPlayerId}
                playerClues={playerClues}
                playerVotes={playerVotes}
                selectedVote={selectedVote}
                onVoteChange={setSelectedVote}
                onVoteSubmit={handleVoteSubmit}
                hasSubmittedVote={hasSubmittedVote}
                isSubmittingVote={isSubmittingVote}
                currentPlayerRole={isFaker ? 'faker' : 'player'}
                hasRevealedRole={isRoleRevealed}
              />
            )}

            {/* Faker Guess Phase */}
            {room?.currentPhase === 'fakerGuess' && (
              <UnifiedFakerGuessPhase
                currentPlayerId={currentPlayerId}
                players={players}
                isFaker={isFaker}
                wordGrid={room?.wordGrid || []}
                secretWord={secretWord || undefined}
                playerClues={playerClues.reduce((acc, pc) => {
                  acc[pc.playerId] = pc.clue;
                  return acc;
                }, {} as Record<string, string>)}
                onGuessSubmit={async (guess) => {
                  try {
                    if (!currentPlayerId || !room?.currentRound) {
                      setToastMessage('Missing player or round information');
                      setToastType('error');
                      setShowToast(true);
                      return;
                    }
                    const result = await submitFakerGuess(roomId, currentPlayerId, guess, room.currentRound);
                    if (!result.success) {
                      setToastMessage(`Error: ${result.error}`);
                      setToastType('error');
                      setShowToast(true);
                    }
                  } catch (error) {
                    console.error('Error submitting faker guess:', error);
                    setToastMessage('Failed to submit guess');
                    setToastType('error');
                    setShowToast(true);
                  }
                }}
                isSubmittingGuess={false}
                hasSubmittedGuess={false}
                currentPlayerRole={isFaker ? 'faker' : 'player'}
              />
            )}

            {/* Results Phase */}
            {room?.currentPhase === 'results' && (
              <UnifiedResultsPhase
                currentPlayerId={currentPlayerId}
                players={players}
                playerClues={playerClues}
                playerVotes={playerVotes}
                playerRoles={playerRoles}
                hasSubmittedVote={hasSubmittedVote}
                isSubmittingVote={isSubmittingVote}
                isHost={isHost}
                currentRound={room?.currentRound}
                totalRounds={room?.totalRounds}
                fakerGuessResult={fakerGuessResult}
                onProceedToFakerGuess={async () => {
                  try {
                    const supabase = createClient();
                    const { error } = await supabase
                      .from('rooms')
                      .update({ current_phase: 'fakerGuess' })
                      .eq('id', roomId);
                    
                    if (error) {
                      setToastMessage(`Error: ${error.message}`);
                      setToastType('error');
                      setShowToast(true);
                    }
                  } catch (error) {
                    console.error('Error transitioning to faker guess:', error);
                    setToastMessage('Failed to proceed to faker guess phase');
                    setToastType('error');
                    setShowToast(true);
                  }
                }}
                onProceedToNextRound={async () => {
                  setIsStartingNextRound(true);
                  try {
                    const result = await startNextRound(roomId);
                    
                    if (!result.success) {
                      console.error('Failed to start next round:', result.error);
                      setToastMessage(`Failed to start next round: ${result.error || 'Unknown error'}`);
                      setToastType('error');
                      setShowToast(true);
                      setIsStartingNextRound(false);
                    } else {
                      // Reset local state for new round
                      setClue('');
                      setSubmittedClue(false);
                      setSelectedVote(null);
                      setFakerGuess('');
                      setHasSubmittedVote(false);
                      setIsStartingNextRound(false);
                    }
                  } catch (error) {
                    console.error('Error starting next round:', error);
                    setToastMessage(`Error starting next round: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    setToastType('error');
                    setShowToast(true);
                    setIsStartingNextRound(false);
                  }
                }}
                onViewFinalScores={async () => {
                  try {
                    const result = await viewFinalScores(roomId);
                    if (!result.success) {
                      setToastMessage(`Error: ${result.error}`);
                      setToastType('error');
                      setShowToast(true);
                    }
                  } catch (error) {
                    console.error('Error viewing final scores:', error);
                    setToastMessage('Failed to view final scores');
                    setToastType('error');
                    setShowToast(true);
                  }
                }}
              />
            )}

            {/* Finished Phase - Game Over */}
            {room?.currentPhase === 'finished' && (
              <div className="space-y-6">
                <Confetti />
                <div className="text-center">
                  {/* Winner Announcement */}
                  {players.length > 0 && (
                    <div className="mb-8">
                      <p className="text-2xl mb-2">The winner is...</p>
                      <p className="text-5xl font-bold text-yellow-400 animate-pulse">
                        🎉 {players.sort((a, b) => (b.score || 0) - (a.score || 0))[0].name}! 🎉
                      </p>
                      <p className="text-xl mt-2 text-gray-300">
                        with {players.sort((a, b) => (b.score || 0) - (a.score || 0))[0].score || 0} points
                      </p>
                    </div>
                  )}
                  
                  {/* Final Scores */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4">Final Scores</h3>
                    <div className="space-y-4 max-w-md mx-auto">
                      {players
                        .sort((a, b) => (b.score || 0) - (a.score || 0))
                        .map((player, index) => (
                          <div 
                            key={player.id} 
                            className={`flex justify-between items-center p-3 rounded-lg ${
                              index === 0 ? 'bg-yellow-700 bg-opacity-30 border-2 border-yellow-400' : 'bg-slate-600'
                            }`}
                          >
                            {index === 0 && <span className="text-2xl">🏆</span>}
                            {index === 1 && <span className="text-2xl">🥈</span>}
                            {index === 2 && <span className="text-2xl">🥉</span>}
                            <span className={`font-bold ${index === 0 ? 'text-yellow-200' : 'text-white'}`}>
                              {player.name}
                            </span>
                            <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-200' : 'text-gray-300'}`}>
                              {player.score || 0} points
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* Play Again Button */}
                  <button
                    onClick={async () => {
                      const result = await restartGame(roomId);
                      if (result.success) {
                        // Redirect to lobby after successful restart
                        router.push(`/lobby?room=${roomId}`);
                      } else {
                        setToastMessage(`Error restarting game: ${result.error}`);
                        setToastType('error');
                        setShowToast(true);
                      }
                    }}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Word Grid - Hidden during voting results display, for faker during fakerGuess phase, and during finished phase */}
        {!(room?.currentPhase === 'results') && !(room?.currentPhase === 'fakerGuess' && isFaker) && !(room?.currentPhase === 'finished') && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{room?.category || 'Word Grid'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
              {(room?.wordGrid || []).map((word, index) => {
                const isSecretWord = (
                  (!isFaker && (room?.currentPhase === 'clueGiving' || room?.currentPhase === 'voting') && secretWord && word === secretWord && isRoleRevealed) ||
                  (room?.currentPhase === 'results' && secretWord && word === secretWord)
                );
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg text-center font-medium transition-all ${
                      isSecretWord 
                        ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-2 ring-offset-slate-800' 
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {word}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Players List */}
        {room?.currentPhase !== 'finished' && room?.currentPhase !== 'results' && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Players ({players.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className={`p-4 bg-slate-700 rounded-lg ${player.id === currentPlayerId ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-gray-400">
                    Score: {player.score}
                    {player.isHost && ' • Host'}
                    {player.id === currentPlayerId && ' • You'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      {room?.currentPhase !== 'finished' && (
        <div className={`flex flex-col sm:flex-row gap-2 sm:gap-0 items-stretch sm:items-center p-4 ${isHost ? 'sm:justify-between' : 'sm:justify-end'}`}>
          {isHost && (
            <button
              onClick={handleEndGame}
              disabled={isEndingGame}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isEndingGame ? 'Ending...' : 'End Game'}
            </button>
          )}
          <button
            onClick={handleLeaveGame}
            disabled={isLeaving}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {isLeaving ? 'Leaving...' : 'Leave Game'}
          </button>
        </div>
      )}
      
      {/* Copyright Footer */}
      <footer className="mt-8 text-center text-slate-400 text-sm py-4">
        <p>Sus Word Game &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
