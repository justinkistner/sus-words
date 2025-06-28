'use client';

import { GamePhaseContainer } from './GamePhaseContainer';
import { PlayerRow } from './PlayerRow';
import { Player } from '@/types/game';

interface UnifiedWaitingForPlayersProps {
  players: Player[];
  currentPlayerId: string;
  currentPlayerRole: 'player' | 'faker' | null;
  playersReadyForClues: { playerId: string; playerName: string; isReady: boolean }[];
  turnOrder: string[];
  buttonHolderIndex: number;
}

export function UnifiedWaitingForPlayers({
  players,
  currentPlayerId,
  currentPlayerRole,
  playersReadyForClues,
  turnOrder,
  buttonHolderIndex
}: UnifiedWaitingForPlayersProps) {
  
  // Get player's turn position
  const getPlayerTurnPosition = (playerId: string) => {
    const index = turnOrder.indexOf(playerId);
    return index >= 0 ? index + 1 : null;
  };

  const readyCount = playersReadyForClues.filter(p => p.isReady).length;
  const totalPlayers = playersReadyForClues.length;

  return (
    <GamePhaseContainer
      title="Waiting for Players"
      subtitle={`${readyCount}/${totalPlayers} players ready to start clue giving`}
      phase="wordReveal"
      currentPlayerRole={currentPlayerRole}
      showRole={true}
      isAnimating={false}
      flipped={false}
      flipCount={0}
    >
      {turnOrder?.map((playerId, index) => {
        const player = players.find(p => p.id === playerId);
        const readyInfo = playersReadyForClues.find(p => p.playerId === playerId);
        if (!player) return null;

        const turnPosition = getPlayerTurnPosition(playerId);
        const isCurrentPlayer = playerId === currentPlayerId;
        const isReady = readyInfo?.isReady || false;

        return (
          <PlayerRow
            key={`${playerId}-${index}`}
            playerId={playerId}
            playerName={player.name}
            isCurrentPlayer={isCurrentPlayer}
            leftContent={
              <div className="flex items-center gap-2">
                {/* Turn number */}
                <span className="text-lg font-bold text-gray-400">
                  {turnPosition}
                </span>
                {/* Button holder indicator */}
                {turnPosition === buttonHolderIndex + 1 && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Goes first" />
                )}
              </div>
            }
            centerContent={
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">
                  {isCurrentPlayer ? 'You' : player.name}
                </span>
              </div>
            }
            rightContent={
              <div className="flex items-center gap-2">
                {isReady ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-400">Ready</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-500">
                      {isCurrentPlayer ? 'Viewing role...' : 'Not ready'}
                    </span>
                  </>
                )}
              </div>
            }
          />
        );
      })}

      {/* Status message */}
      <div className="mt-4 p-4 rounded-lg text-center bg-slate-600 border border-slate-500">
        <p className="text-sm text-slate-200">
          {readyCount === totalPlayers 
            ? "All players are ready! Starting clue giving phase..."
            : `Waiting for ${totalPlayers - readyCount} more player${totalPlayers - readyCount !== 1 ? 's' : ''} to be ready.`
          }
        </p>
        <p className="text-xs text-slate-400 mt-1">
          The game will start automatically when everyone is ready.
        </p>
      </div>
    </GamePhaseContainer>
  );
}
