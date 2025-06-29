'use client';

import { GamePhaseContainer } from './GamePhaseContainer';
import { PlayerRow } from './PlayerRow';
import { Player } from '@/types/game';

interface UnifiedResultsPhaseProps {
  currentPlayerId: string;
  players: Player[];
  playerClues: Array<{ playerId: string; clue: string }>;
  playerVotes: Array<{ voterId: string; votedForId: string }>;
  playerRoles?: Record<string, 'player' | 'faker'>;
  hasSubmittedVote: boolean;
  isSubmittingVote: boolean;
  isHost?: boolean;
  onProceedToFakerGuess?: () => void;
  onProceedToNextRound?: () => void;
  onViewFinalScores?: () => void;
  currentRound?: number;
  totalRounds?: number;
  fakerGuessResult?: { guess: string | null; isCorrect: boolean } | null;
}

export function UnifiedResultsPhase({
  currentPlayerId,
  players,
  playerClues,
  playerVotes,
  playerRoles,
  hasSubmittedVote,
  isSubmittingVote,
  isHost,
  onProceedToFakerGuess,
  onProceedToNextRound,
  onViewFinalScores,
  currentRound,
  totalRounds,
  fakerGuessResult
}: UnifiedResultsPhaseProps) {
  // Calculate vote counts
  const voteCounts = playerVotes.reduce((acc, vote) => {
    acc[vote.votedForId] = (acc[vote.votedForId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get who voted for each player
  const getVotersForPlayer = (playerId: string) => {
    return playerVotes
      .filter(v => v.votedForId === playerId)
      .map(v => {
        const voter = players.find(p => p.id === v.voterId);
        return voter?.name || 'Unknown';
      });
  };

  // Find the faker
  const fakerId = Object.entries(playerRoles || {}).find(([_, role]) => role === 'faker')?.[0];
  const fakerVotes = fakerId ? (voteCounts[fakerId] || 0) : 0;
  
  // Determine if faker was caught (got the most votes or tied for most)
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const fakerWasCaught = fakerId && fakerVotes > 0 && fakerVotes === maxVotes;

  // Calculate points for each player
  const calculatePoints = (playerId: string) => {
    const playerRole = playerRoles?.[playerId];
    const voteCount = voteCounts[playerId] || 0;
    
    if (playerRole === 'faker') {
      if (fakerWasCaught) {
        // Faker was caught - check if they guessed correctly
        if (fakerGuessResult && fakerGuessResult.isCorrect) {
          // Faker guessed correctly after being caught - gets 1 point
          return 1;
        } else {
          // Faker was caught and failed to guess - gets 0 points
          return 0;
        }
      } else {
        // Faker escaped detection - gets 2 points
        return 2;
      }
    } else {
      // Players get points based on whether faker was caught
      if (fakerWasCaught) {
        // If faker was caught, check if faker guessed correctly
        if (fakerGuessResult && fakerGuessResult.isCorrect) {
          // Faker guessed correctly - players who voted for faker get 0 points
          return 0;
        } else {
          // Faker failed to guess - players who voted for faker get 2 points
          const votedForFaker = playerVotes.some(v => v.voterId === playerId && v.votedForId === fakerId);
          return votedForFaker ? 2 : 0;
        }
      } else {
        // If faker wasn't caught, all players get 0 points
        return 0;
      }
    }
  };

  // Sort players by vote count (descending)
  const sortedPlayers = [...players].sort((a, b) => {
    const aVotes = voteCounts[a.id] || 0;
    const bVotes = voteCounts[b.id] || 0;
    return bVotes - aVotes;
  });

  const combinedMessage = (() => {
    if (fakerWasCaught) {
      if (fakerGuessResult && fakerGuessResult.isCorrect) {
        return "The faker was caught but guessed the word correctly! They get 1 point. Everyone else gets 0.";
      } else {
        return "The faker was caught and failed to guess the word! Players who voted for the faker get 2 points. Everyone else gets 0.";
      }
    } else {
      return "The faker escaped detection! They get 2 points. Everyone else gets 0.";
    }
  })();

  return (
    <GamePhaseContainer
      title="Voting Results"
      subtitle={combinedMessage}
      phase="results"
    >

      {sortedPlayers.map((player) => {
        const isCurrentPlayer = player.id === currentPlayerId;
        const voteCount = voteCounts[player.id] || 0;
        const voters = getVotersForPlayer(player.id);
        const playerRole = playerRoles?.[player.id];

        return (
          <PlayerRow
            key={player.id}
            playerId={player.id}
            playerName={player.name}
            isCurrentPlayer={isCurrentPlayer}
            leftContent={
              <div className="flex items-center gap-3">
                {/* Points awarded */}
                <div className="text-sm font-medium">
                  {(() => {
                    const points = calculatePoints(player.id);
                    return points > 0 ? (
                      <span className="text-green-400">+{points}</span>
                    ) : (
                      <span className="text-gray-400">+0</span>
                    );
                  })()}
                </div>
                {/* Player name */}
                <span className="font-medium">
                  {isCurrentPlayer ? 'You' : player.name}
                </span>
              </div>
            }
            centerContent={
              <div className="flex items-center">
                {/* Role indicator (faker only, no label) */}
                {playerRole === 'faker' && (
                  <div className="px-3 py-1 rounded-lg text-sm font-bold bg-red-600 text-white">
                    FAKER
                  </div>
                )}
              </div>
            }
            rightContent={
              <div className="flex items-center">
                {/* Voting information */}
                {voters.length > 0 && (
                  <span className="text-xs text-gray-400">
                    Voted by: {voters.join(', ')}
                  </span>
                )}
              </div>
            }
          />
        );
      })}

    </GamePhaseContainer>
  );
}
