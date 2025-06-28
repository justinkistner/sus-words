'use client';

import { useState } from 'react';
import { GamePhaseContainer } from './GamePhaseContainer';
import { PlayerRow } from './PlayerRow';
import { Player } from '@/types/game';

interface UnifiedVotingPhaseProps {
  currentPlayerId: string;
  playerClues: Array<{ playerId: string; playerName: string; clue: string }>;
  playerVotes: Array<{ voterId: string; votedForId: string }>;
  selectedVote: string | null;
  onVoteChange: (playerId: string | null) => void;
  onVoteSubmit: () => Promise<void>;
  hasSubmittedVote: boolean;
  isSubmittingVote: boolean;
  currentPlayerRole?: 'player' | 'faker' | null;
  hasRevealedRole?: boolean;
}

export function UnifiedVotingPhase({
  currentPlayerId,
  playerClues,
  playerVotes,
  selectedVote,
  onVoteChange,
  onVoteSubmit,
  hasSubmittedVote,
  isSubmittingVote,
  currentPlayerRole,
  hasRevealedRole = true
}: UnifiedVotingPhaseProps) {
  // Check if current player has already voted
  const currentPlayerVote = playerVotes.find(v => v.voterId === currentPlayerId);
  const hasVoted = hasSubmittedVote || !!currentPlayerVote;

  const handleVoteClick = (playerId: string) => {
    if (!hasVoted) {
      onVoteChange(playerId);
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedVote || isSubmittingVote) return;
    await onVoteSubmit();
  };

  // Check if a player has submitted their vote
  const hasPlayerVoted = (playerId: string) => {
    return playerVotes.some(v => v.voterId === playerId);
  };

  return (
    <GamePhaseContainer
      title="Voting Time!"
      subtitle="Vote for who you think is the faker"
      phase="voting"
      currentPlayerRole={currentPlayerRole}
      showRole={hasRevealedRole}
    >
      {playerClues.map((playerClue) => {
        const isCurrentPlayer = playerClue.playerId === currentPlayerId;
        const hasVotedForThis = selectedVote === playerClue.playerId;
        const hasSubmittedVoteForThis = hasVoted && (currentPlayerVote?.votedForId === playerClue.playerId || selectedVote === playerClue.playerId);
        const playerHasVoted = hasPlayerVoted(playerClue.playerId);

        return (
          <PlayerRow
            key={playerClue.playerId}
            playerId={playerClue.playerId}
            playerName={playerClue.playerName}
            isCurrentPlayer={isCurrentPlayer}
            leftContent={
              <div className="flex items-center gap-3">
                {/* Voting status indicator */}
                {playerHasVoted ? (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 bg-transparent border-2 border-gray-500 rounded-full" />
                )}
                
                {/* Player name */}
                <span className="font-medium">
                  {isCurrentPlayer ? 'You' : playerClue.playerName}
                </span>
              </div>
            }
            centerContent={null}
            rightContent={
              <div className="flex items-center gap-3">
                {/* Clue */}
                <span className="text-blue-400">{playerClue.clue}</span>
                
                {/* Vote button/status */}
                {!isCurrentPlayer ? (
                  <div className="flex-shrink-0">
                    {!hasVoted ? (
                      hasVotedForThis ? (
                        <button
                          onClick={handleVoteSubmit}
                          disabled={isSubmittingVote}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                        >
                          {isSubmittingVote ? 'Submitting...' : 'Final Answer?'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVoteClick(playerClue.playerId)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                        >
                          Vote
                        </button>
                      )
                    ) : (
                      hasSubmittedVoteForThis ? (
                        <div className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Voted
                        </div>
                      ) : (
                        <div className="px-4 py-2 text-gray-400">
                          Not Voted
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg font-medium cursor-not-allowed opacity-50"
                  >
                    You
                  </button>
                )}
              </div>
            }
          />
        );
      })}
    </GamePhaseContainer>
  );
}
