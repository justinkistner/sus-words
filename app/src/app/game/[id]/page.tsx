'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GamePhase, Player } from '@/types/game';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { leaveGame, endGame, submitClue, submitVote, submitFakerGuess, startNextRound } from '@/lib/gameActions';
import { Confetti } from '@/components/Confetti';
import RoleReveal from '@/components/RoleReveal';

export default function Game() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  
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
    isLoading,
    error,
    isConnected,
    connectionError
  } = useGameRealtime(roomId);
  
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

  // Reset local state when round changes
  useEffect(() => {
    if (room?.currentPhase === 'clueGiving') {
      // Reset clue-related state for new round
      setClue('');
      setSubmittedClue(false);
      setSelectedVote(null);
      setFakerGuess('');
      setHasSubmittedVote(false);
      setHasRevealedRole(false);
    }
  }, [room?.currentRound, room?.currentPhase]);

  const handleLeaveGame = async () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || isLeaving) return;
    
    setIsLeaving(true);
    const result = await leaveGame(roomId, playerId);
    
    if (result.success) {
      router.push('/');
    } else {
      alert(result.error || 'Failed to leave game');
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
      alert('Game ended!');
    } else {
      alert(result.error || 'Failed to end game');
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
    
    try {
      const result = await submitFakerGuess(roomId, playerId, selectedVote, room?.currentRound || 1);
      
      if (result.success) {
        setHasSubmittedVote(true);
      } else {
        alert(`Error: ${result.error}`);
        // Reset state on error so user can try again
        setSelectedVote(null);
      }
    } catch (error) {
      console.error('Vote submission error:', error);
      alert('Failed to submit vote. Please try again.');
      // Reset state on error so user can try again
      setSelectedVote(null);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Check if current player has already submitted a clue
  const hasSubmittedClue = playerClues.some(pc => pc.playerId === currentPlayerId) || submittedClue;

  // Check if current player is the host
  const isHost = room?.hostId === currentPlayerId;

  // Check if current player has already voted
  const hasVoted = playerVotes.some(v => v.voterId === currentPlayerId) || hasSubmittedVote;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-2xl font-bold mb-4">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-2xl font-bold mb-4 text-red-500">Error</div>
        <p className="text-gray-300">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
        <div className="text-2xl font-bold mb-4">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Connection status */}
        {connectionError && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-300">{connectionError}</p>
          </div>
        )}
        
        {!isConnected && !connectionError && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
            <p className="text-yellow-300">Connecting to game...</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6 h-12">
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">{room?.name || 'Loading...'}</h1>
          </div>
          
          {/* Center - Next Round Button (Results Phase Only) */}
          <div className="flex-1 flex justify-center items-center">
            {room?.currentPhase === 'results' && isHost && (
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
                          alert(`Failed to start next round: ${result.error || 'Unknown error'}`);
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
                        alert(`Error starting next round: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        setIsStartingNextRound(false);
                      }
                    }}
                    disabled={isStartingNextRound}
                    className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                  >
                    {isStartingNextRound ? 'Starting...' : 'Next Round'}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase
                        .from('rooms')
                        .update({ current_phase: 'finished' })
                        .eq('id', roomId);
                    }}
                    className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    View Final Score
                  </button>
                )}
              </>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-400">
              Round {room?.currentRound || 0} of {room?.totalRounds || 3}
            </p>
          </div>
        </div>

        {/* Player Role Info / Voting / Results - Unified Container */}
        {(room?.currentPhase === 'clueGiving' || room?.currentPhase === 'voting' || room?.currentPhase === 'results' || room?.currentPhase === 'fakerGuess' || room?.currentPhase === 'finished') && currentPlayerId && (
          <div className="mb-8 p-6 bg-slate-700 rounded-lg transition-all duration-300 ease-in-out" style={{ minHeight: room?.currentPhase === 'voting' || room?.currentPhase === 'results' || room?.currentPhase === 'fakerGuess' || room?.currentPhase === 'finished' ? 'auto' : '180px' }}>
            {/* Clue Giving Phase */}
            {room?.currentPhase === 'clueGiving' && (
              <div className="animate-fadeIn">
                <RoleReveal 
                  isFaker={isFaker} 
                  secretWord={secretWord || undefined}
                  onRevealComplete={() => setHasRevealedRole(true)}
                  clue={clue}
                  onClueChange={setClue}
                  onClueSubmit={() => {}}
                  hasSubmittedClue={submittedClue}
                  isSubmittingClue={false}
                />
              </div>
            )}

            {/* Voting Phase */}
            {room?.currentPhase === 'voting' && (
              <div className="animate-fadeIn">
                <h3 className="text-xl font-semibold mb-4">All Clues:</h3>
                <div className="space-y-3">
                  {playerClues.map((pc) => {
                    const isCurrentPlayer = pc.playerId === currentPlayerId;
                    const hasVotedForThis = selectedVote === pc.playerId;
                    const hasSubmittedVoteForThis = hasSubmittedVote && selectedVote === pc.playerId;
                    // Check if this player has submitted a vote (not received votes)
                    const playerHasSubmittedVote = playerVotes.some(v => v.voterId === pc.playerId);
                    
                    return (
                      <div key={pc.playerId} className="flex items-center gap-4 p-3 bg-slate-600 rounded-lg">
                        {/* Voting Status Icon */}
                        <div className="flex-shrink-0">
                          {playerHasSubmittedVote ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                              <span className="text-gray-300 text-sm">○</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Player Name and Clue */}
                        <div className="flex-1">
                          <span className="font-medium">{pc.playerName}: </span>
                          <span className="text-blue-400">{pc.clue}</span>
                        </div>
                        
                        {/* Vote Button */}
                        {!isCurrentPlayer && (
                          <div className="flex-shrink-0">
                            {!hasVotedForThis && !hasSubmittedVote && (
                              <button
                                onClick={() => setSelectedVote(pc.playerId)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                              >
                                Vote
                              </button>
                            )}
                            
                            {hasVotedForThis && !hasSubmittedVoteForThis && (
                              <button
                                onClick={handleVoteSubmit}
                                disabled={isSubmittingVote}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                              >
                                {isSubmittingVote ? 'Confirming...' : 'Confirm'}
                              </button>
                            )}
                            
                            {hasSubmittedVoteForThis && (
                              <div className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium flex items-center gap-2">
                                <span>✓</span>
                                <span>Voted</span>
                              </div>
                            )}
                            
                            {hasSubmittedVote && !hasSubmittedVoteForThis && (
                              <div className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg font-medium">
                                —
                              </div>
                            )}
                          </div>
                        )}
                        
                        {isCurrentPlayer && (
                          <div className="flex-shrink-0 px-4 py-2 bg-gray-600 text-gray-400 rounded-lg font-medium">
                            You
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Faker Guess Phase */}
            {room?.currentPhase === 'fakerGuess' && (
              <div className="space-y-6">
                <div className="bg-slate-700 rounded-lg p-6 text-center">
                  <h3 className="text-2xl font-bold mb-2">
                    {isFaker ? "You've been caught! Try to guess the secret word:" : "The faker was caught!"}
                  </h3>
                  
                  {isFaker ? (
                    <div className="space-y-4">
                      {/* Selected word display */}
                      {fakerGuess && (
                        <div className="mb-4 p-4 bg-slate-600 rounded-lg">
                          <p className="text-sm text-gray-300 mb-2">Your guess:</p>
                          <p className="text-xl font-bold text-blue-400">{fakerGuess}</p>
                        </div>
                      )}
                      
                      {/* Word Grid as buttons */}
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        {(Array.isArray(room?.wordGrid) ? room?.wordGrid : []).flat().map((word: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => setFakerGuess(word)}
                            disabled={isSubmittingVote}
                            className={`p-3 rounded-lg font-medium transition-all ${
                              fakerGuess === word
                                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                : 'bg-slate-600 hover:bg-slate-500 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {word}
                          </button>
                        ))}
                      </div>
                      
                      {/* Confirm button */}
                      <button
                        onClick={async () => {
                          if (!fakerGuess) return;
                          
                          setIsSubmittingVote(true);
                          const playerId = localStorage.getItem('playerId');
                          if (!playerId) return;
                          
                          const result = await submitFakerGuess(roomId, playerId, fakerGuess, room?.currentRound || 1);
                          
                          if (!result.success) {
                            alert(`Error: ${result.error}`);
                          }
                          setIsSubmittingVote(false);
                        }}
                        disabled={!fakerGuess || isSubmittingVote}
                        className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        {isSubmittingVote ? 'Submitting...' : 'Confirm Guess'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base text-gray-300">
                        {players.find(p => p.role === 'faker')?.name || 'The faker'} is now guessing the secret word...
                      </p>
                      <div className="animate-pulse mt-4">
                        <div className="h-2 bg-slate-600 rounded w-32 mx-auto"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Phase */}
            {room?.currentPhase === 'results' && (
              <div className="animate-fadeIn space-y-6">
                {/* Result Summary */}
                <div className="text-center">
                  {(() => {
                    // Calculate who got the most votes
                    const voteCount: Record<string, number> = {};
                    players.forEach(p => voteCount[p.id] = 0);
                    playerVotes.forEach(v => {
                      voteCount[v.votedForId] = (voteCount[v.votedForId] || 0) + 1;
                    });
                    
                    const fakerId = players.find(p => p.role === 'faker')?.id;
                    const fakerName = players.find(p => p.role === 'faker')?.name || 'Unknown';
                    const maxVotes = Math.max(...Object.values(voteCount));
                    const mostVotedId = Object.entries(voteCount).find(([_, count]) => count === maxVotes)?.[0];
                    const mostVotedName = players.find(p => p.id === mostVotedId)?.name || 'Unknown';
                    
                    const fakerCaught = mostVotedId === fakerId;
                    
                    if (fakerCaught) {
                      if (fakerGuessResult?.isCorrect === true) {
                        return (
                          <>
                            <h3 className="text-2xl font-bold text-yellow-400 mb-2">The Faker Escaped!</h3>
                            <p className="text-lg text-gray-300">
                              {fakerName} was caught, but guessed the secret word correctly!
                            </p>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <h3 className="text-2xl font-bold text-green-400 mb-2">The Faker Was Caught!</h3>
                            <p className="text-lg text-gray-300">
                              Majority voted for {fakerName} and they failed to guess the secret word.
                            </p>
                          </>
                        );
                      }
                    } else {
                      return (
                        <>
                          <h3 className="text-2xl font-bold text-red-400 mb-2">The Faker Escaped!</h3>
                          <p className="text-lg text-gray-300">
                            Majority voted for {mostVotedName}, but {fakerName} was the faker.
                          </p>
                        </>
                      );
                    }
                  })()}
                </div>

                {/* Voting Results */}
                <div>
                  <div className="space-y-4">
                    {(() => {
                      // Calculate who got the most votes for scoring logic
                      const voteCount: Record<string, number> = {};
                      players.forEach(p => voteCount[p.id] = 0);
                      playerVotes.forEach(v => {
                        voteCount[v.votedForId] = (voteCount[v.votedForId] || 0) + 1;
                      });
                      
                      const fakerId = players.find(p => p.role === 'faker')?.id;
                      const maxVotes = Math.max(...Object.values(voteCount));
                      const mostVotedId = Object.entries(voteCount).find(([_, count]) => count === maxVotes)?.[0];
                      const fakerWonVote = mostVotedId === fakerId;
                      
                      return players.map((player) => {
                        const votesForPlayer = playerVotes.filter(v => v.votedForId === player.id);
                        const voterNames = votesForPlayer.map(v => 
                          players.find(p => p.id === v.voterId)?.name || 'Unknown'
                        );
                        
                        // Calculate points for this player
                        let points = 0;
                        let reason = '';
                        
                        if (player.role === 'faker') {
                          if (fakerWonVote) {
                            // Check if faker guessed correctly
                            if (fakerGuessResult?.isCorrect === true) {
                              points = 1;
                              reason = 'Guessed the secret word correctly';
                            } else {
                              points = 0;
                              reason = 'Failed to guess the secret word';
                            }
                          } else {
                            points = 2;
                            reason = 'Majority voted for wrong person';
                          }
                        } else {
                          // Regular players
                          if (fakerWonVote) {
                            // Check if this player voted for the faker
                            const votedForFaker = playerVotes.find(v => v.voterId === player.id)?.votedForId === fakerId;
                            if (votedForFaker) {
                              // Only give points if faker failed to guess word
                              if (fakerGuessResult?.isCorrect === false) {
                                points = 2;
                                reason = 'Correctly identified faker';
                              } else {
                                points = 0;
                                reason = 'Faker guessed the word';
                              }
                            }
                          }
                        }
                        
                        return (
                          <div key={player.id} className="p-3 bg-slate-600 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{player.name}</span>
                                {player.role === 'faker' && (
                                  <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">FAKER</span>
                                )}
                              </div>
                              <div className="text-sm">
                                {votesForPlayer.length > 0 ? (
                                  <span>Votes: {voterNames.join(', ')}</span>
                                ) : (
                                  <span className="text-gray-400">No votes</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${points > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                +{points} pts
                              </span>
                              {reason && (
                                <span className="text-xs text-gray-500">({reason})</span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Finished Phase - Game Over */}
            {room?.currentPhase === 'finished' && (
              <div className="animate-fadeIn space-y-6">
                <Confetti />
                <div className="text-center">
                  <h2 className="text-4xl font-bold mb-2 text-yellow-400">🎉 Game Over! 🎉</h2>
                  
                  {/* Winner Announcement */}
                  {players.length > 0 && (
                    <div className="mb-8">
                      <p className="text-2xl mb-2">The winner is...</p>
                      <p className="text-5xl font-bold text-yellow-400 animate-pulse">
                        {players.sort((a, b) => (b.score || 0) - (a.score || 0))[0].name}!
                      </p>
                      <p className="text-xl mt-2 text-gray-300">
                        with {players.sort((a, b) => (b.score || 0) - (a.score || 0))[0].score || 0} points
                      </p>
                    </div>
                  )}
                  
                  {/* Final Scores */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Final Scores:</h3>
                    <div className="space-y-4 max-w-md mx-auto">
                      {players
                        .sort((a, b) => (b.score || 0) - (a.score || 0))
                        .map((player, index) => (
                          <div 
                            key={player.id} 
                            className={`flex justify-between items-center p-3 rounded-lg ${
                              index === 0 ? 'bg-yellow-600 bg-opacity-30 border-2 border-yellow-400' : 'bg-slate-600'
                            }`}
                          >
                            {index === 0 && <span className="text-2xl">🏆</span>}
                            {index === 1 && <span className="text-2xl">🥈</span>}
                            {index === 2 && <span className="text-2xl">🥉</span>}
                            <span className={`font-medium ${index === 0 ? 'text-yellow-400' : ''}`}>
                              {player.name}
                            </span>
                            <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                              {player.score || 0} points
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* Return Home Button */}
                  <button
                    onClick={() => router.push('/')}
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
            <div className="grid grid-cols-4 gap-4">
              {(room?.wordGrid || []).map((word, index) => {
                const isSecretWord = (
                  (!isFaker && (room?.currentPhase === 'clueGiving' || room?.currentPhase === 'voting') && secretWord && word === secretWord && hasRevealedRole) ||
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
        {room?.currentPhase !== 'finished' && (
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
        <div className={`flex items-center p-4 bg-slate-800 rounded-lg shadow-lg ${isHost ? 'justify-between' : 'justify-end'}`}>
          {isHost && (
            <button
              onClick={handleEndGame}
              disabled={isEndingGame}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isEndingGame ? 'Ending...' : 'End Game'}
            </button>
          )}
          <button
            onClick={handleLeaveGame}
            disabled={isLeaving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {isLeaving ? 'Leaving...' : 'Leave Game'}
          </button>
        </div>
      )}
    </div>
  );
}
