'use client';

import { useState, useEffect } from 'react';
import { GamePhaseContainer } from './GamePhaseContainer';
import { PlayerRow } from './PlayerRow';
import { TimerSubmitButton } from './TimerSubmitButton';
import { Player } from '@/types/game';

interface UnifiedTurnBasedClueGivingProps {
  currentPlayerId: string;
  isFaker: boolean;
  secretWord?: string;
  currentTurnPlayerId: string;
  turnStartedAt: number;
  buttonHolderIndex: number;
  players: Player[];
  playerClues: Array<{ playerId: string; playerName: string; clue: string }>;
  clue: string;
  onClueChange: (clue: string) => void;
  onClueSubmit: (clue: string) => Promise<void>;
  hasSubmittedClue: boolean;
  isSubmittingClue: boolean;
  hasRevealedRole: boolean;
  onRevealRole: () => void;
  currentPlayerRole?: 'player' | 'faker' | null;
}

export function UnifiedTurnBasedClueGiving({
  currentPlayerId,
  isFaker,
  secretWord,
  currentTurnPlayerId,
  turnStartedAt,
  buttonHolderIndex,
  players,
  playerClues,
  clue,
  onClueChange,
  onClueSubmit,
  hasSubmittedClue,
  isSubmittingClue,
  hasRevealedRole,
  onRevealRole,
  currentPlayerRole
}: UnifiedTurnBasedClueGivingProps) {
  const currentTurnPlayer = players.find(p => p.id === currentTurnPlayerId);
  const isMyTurn = currentPlayerId === currentTurnPlayerId;
  
  // Timer logic for compact submit button
  const [timeRemaining, setTimeRemaining] = useState(20); // Default 20 seconds
  
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = Math.max(0, 20 - elapsed); // Use 20 seconds to match existing turnTimeLimit
      setTimeRemaining(remaining);
    }, 100);
    
    return () => clearInterval(interval);
  }, [turnStartedAt]);
  
  console.log('UnifiedTurnBasedClueGiving Debug:', 
    'currentPlayerRole=', currentPlayerRole,
    'hasRevealedRole=', hasRevealedRole,
    'isFaker=', isFaker,
    'currentPlayerId=', currentPlayerId
  );
  
  const handleSubmitClue = async () => {
    await onClueSubmit(clue.trim());
  };

  // Get turn order from players
  const turnOrder = players.map(p => p.id);

  // Get player's turn position
  const getPlayerTurnPosition = (playerId: string) => {
    const index = turnOrder.indexOf(playerId);
    return index >= 0 ? index + 1 : null;
  };

  // Get player's clue if they've submitted one
  const getPlayerClue = (playerId: string) => {
    return playerClues.find(c => c.playerId === playerId)?.clue;
  };

  return (
    <GamePhaseContainer
      title={`${currentTurnPlayer?.name || 'Unknown'}'s Turn`}
      subtitle="Give a one-word clue about the secret word"
      phase="clueGiving"
      currentPlayerRole={currentPlayerRole}
      showRole={hasRevealedRole}
    >
      {players.map((player, index) => {
        const playerId = player.id;
        const isMe = playerId === currentPlayerId;
        const playerClue = playerClues.find(c => c.playerId === playerId);
        const hasGivenClue = !!playerClue;
        const isCurrentTurn = playerId === currentTurnPlayerId;
        
        return (
          <PlayerRow
            key={`${playerId}-${index}`}
            playerId={playerId}
            playerName={isMe ? 'You' : player.name}
            isCurrentPlayer={isMe}
            isActivePlayer={isCurrentTurn}
            leftContent={
              <div className="flex items-center gap-3">
                {/* Circle checkbox indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  hasGivenClue 
                    ? 'bg-green-500 border-green-500' 
                    : 'bg-transparent border-gray-500'
                }`}>
                  {hasGivenClue && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                
                {/* Player name */}
                <span className="font-medium">
                  {isMe ? 'You' : player.name}
                </span>
              </div>
            }
            centerContent={null}
            rightContent={
              <div className="flex items-center gap-3">
                {/* For current turn player who is me - show input */}
                {isCurrentTurn && isMe && (
                  <div className="flex items-center w-full max-w-sm">
                    {/* Connected input and submit button */}
                    <div className="flex w-full">
                      <input
                        type="text"
                        value={clue}
                        onChange={(e) => onClueChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !hasSubmittedClue && !isSubmittingClue) {
                            handleSubmitClue();
                          }
                        }}
                        placeholder="Enter your clue..."
                        className="bg-slate-600 text-white px-3 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
                        disabled={hasSubmittedClue || isSubmittingClue}
                      />
                      {/* Compact submit button with icon */}
                      <button
                        onClick={handleSubmitClue}
                        disabled={!clue.trim() || hasSubmittedClue || isSubmittingClue}
                        className={`px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-r-lg font-medium transition-all flex items-center justify-center min-w-[44px] ${
                          timeRemaining < 5 && timeRemaining > 0 ? 'animate-pulse bg-red-600 hover:bg-red-700' : ''
                        }`}
                        title={isSubmittingClue ? 'Submitting...' : `Submit (${timeRemaining}s)`}
                      >
                        {isSubmittingClue ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* For current turn player who is not me - show thinking */}
                {isCurrentTurn && !isMe && !hasGivenClue && (
                  <span className="text-gray-400 italic">Thinking...</span>
                )}
                
                {/* For any player who has given a clue - show the clue */}
                {hasGivenClue && playerClue && (
                  <span className="text-blue-400">{playerClue.clue}</span>
                )}
              </div>
            }
          />
        );
      })}
    </GamePhaseContainer>
  );
}
