'use client';

import { useEffect, useState } from 'react';

interface TurnBasedClueGivingProps {
  // Current player info
  currentPlayerId: string;
  isFaker: boolean;
  secretWord?: string;
  
  // Turn info
  currentTurnPlayerId: string | null;
  turnStartedAt: string | null;
  buttonHolderIndex: number | null;
  
  // Players and clues
  players: Array<{ id: string; name: string; role: string }>;
  playerClues: Array<{ playerId: string; playerName: string; clue: string; submissionOrder?: number }>;
  
  // Clue submission
  clue: string;
  onClueChange: (clue: string) => void;
  onClueSubmit: (e: React.FormEvent) => void;
  hasSubmittedClue: boolean;
  isSubmittingClue: boolean;
  
  // Role reveal state from parent
  hasRevealedRole: boolean;
  onRevealComplete: () => void;
}

export default function TurnBasedClueGiving({
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
  onRevealComplete
}: TurnBasedClueGivingProps) {
  const [timeRemaining, setTimeRemaining] = useState(60);
  
  // Find current turn player
  const currentTurnPlayer = players.find(p => p.id === currentTurnPlayerId);
  const isMyTurn = currentPlayerId === currentTurnPlayerId;
  
  // Debug logging
  console.log('TurnBasedClueGiving Debug:', {
    currentPlayerId,
    currentTurnPlayerId,
    isMyTurn,
    hasSubmittedClue,
    currentTurnPlayer: currentTurnPlayer?.name,
    turnStartedAt,
    players: players.map(p => ({ id: p.id, name: p.name }))
  });
  
  // Sort players by turn order
  const sortedPlayers = [...players].sort((a, b) => {
    const aIndex = players.indexOf(a);
    const bIndex = players.indexOf(b);
    return aIndex - bIndex;
  });
  
  // Timer effect
  useEffect(() => {
    if (!turnStartedAt || !isMyTurn || hasSubmittedClue) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(turnStartedAt).getTime()) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [turnStartedAt, isMyTurn, hasSubmittedClue]);
  
  // Sort clues by submission order
  const sortedClues = [...playerClues].sort((a, b) => 
    (a.submissionOrder || 0) - (b.submissionOrder || 0)
  );

  // Call onRevealComplete when component mounts if not already revealed
  useEffect(() => {
    if (!hasRevealedRole) {
      onRevealComplete();
    }
  }, [hasRevealedRole, onRevealComplete]);
  
  // Show turn-based clue giving UI
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Combined role and turn indicator */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 border border-slate-600">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isMyTurn ? "Your Turn" : `${currentTurnPlayer?.name || 'Unknown'}'s Turn`}
            </h3>
            {isMyTurn && !hasSubmittedClue && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-32 bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(timeRemaining / 60) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400">{timeRemaining}s</span>
              </div>
            )}
          </div>
          
          {/* Role flip animation instead of static text */}
          <div className="flex-shrink-0">
            <MiniRoleFlip isFaker={isFaker} />
          </div>
        </div>
        
        {/* Turn order with button holder */}
        <div className="flex items-center gap-2 flex-wrap">
          {sortedPlayers.map((player, index) => {
            const hasSubmitted = playerClues.some(pc => pc.playerId === player.id);
            const isCurrent = player.id === currentTurnPlayerId;
            const isMe = player.id === currentPlayerId;
            
            return (
              <div
                key={player.id}
                className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-all relative
                  ${isCurrent ? 'bg-blue-600 text-white scale-110' : 
                    hasSubmitted ? 'bg-green-600/20 text-green-400' : 
                    'bg-slate-600 text-gray-400'}
                `}
              >
                {isMe ? 'You' : player.name}
                {hasSubmitted && ' ✓'}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Clue submission (only if it's your turn) */}
      {isMyTurn && !hasSubmittedClue && (
        <form onSubmit={onClueSubmit} className="bg-slate-800 rounded-lg p-4 border-2 border-blue-500 animate-pulse-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={clue}
              onChange={(e) => onClueChange(e.target.value)}
              placeholder={isFaker ? "Enter a fake clue to blend in..." : `Enter a clue for "${secretWord}"...`}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmittingClue || hasSubmittedClue}
              autoFocus
            />
            <button
              type="submit"
              disabled={!clue.trim() || isSubmittingClue || hasSubmittedClue}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmittingClue ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
      
      {/* Waiting message with revealed clues */}
      {!isMyTurn && !hasSubmittedClue && (
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400 text-center mb-4">
            Waiting for {currentTurnPlayer?.name || 'player'} to submit their clue...
          </p>
          
          {/* Show revealed clues here */}
          {sortedClues.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Clues revealed:</h4>
              <div className="space-y-2">
                {sortedClues.map((pc, index) => (
                  <div key={pc.playerId} className="flex items-center gap-2 animate-slideIn" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                    <span className="text-sm font-medium text-white min-w-[80px]">{pc.playerName}:</span>
                    <span className="text-sm text-blue-400 italic">"{pc.clue}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Already submitted message with revealed clues */}
      {hasSubmittedClue && (
        <div className="bg-green-600/20 rounded-lg p-4 border border-green-600/30">
          <p className="text-green-400 text-center mb-4">✓ Clue submitted! Waiting for other players...</p>
          
          {/* Show revealed clues here too */}
          {sortedClues.length > 0 && (
            <div className="border-t border-green-600/30 pt-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Clues revealed:</h4>
              <div className="space-y-2">
                {sortedClues.map((pc, index) => (
                  <div key={pc.playerId} className="flex items-center gap-2 animate-slideIn" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                    <span className="text-sm font-medium text-white min-w-[80px]">{pc.playerName}:</span>
                    <span className="text-sm text-blue-400 italic">"{pc.clue}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mini role flip animation for the header
function MiniRoleFlip({ isFaker }: { isFaker: boolean }) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Shorter flip sequence for the mini version
  const flipOptions = ['PLAYER', 'FAKER', 'PLAYER', 'FAKER'];
  const finalRole = isFaker ? 'FAKER' : 'PLAYER';
  const allOptions = [...flipOptions, finalRole];
  
  useEffect(() => {
    if (!isAnimating) return;
    
    let flipCount = 0;
    const totalFlips = flipOptions.length;
    
    const flipInterval = setInterval(() => {
      flipCount++;
      setCurrentIndex(flipCount);
      
      if (flipCount >= totalFlips) {
        clearInterval(flipInterval);
        setIsAnimating(false);
      }
    }, 150); // Faster flips for mini version
    
    return () => clearInterval(flipInterval);
  }, [isAnimating, flipOptions.length]);
  
  const currentOption = allOptions[currentIndex];
  
  return (
    <div className="relative" style={{ width: '120px', height: '40px', perspective: '1000px' }}>
      {/* 3D Flip Card */}
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: isAnimating ? 'transform 0.15s' : 'transform 0.4s ease-out',
          transform: `rotateX(${currentIndex * 180}deg)`,
        }}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-slate-800 rounded shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateX(0deg)',
          }}
        >
          <span className={`text-lg font-bold ${
            currentOption === 'FAKER' ? 'text-red-500' : 'text-green-500'
          }`}>
            {currentOption}
          </span>
        </div>
        
        {/* Back Face */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-slate-800 rounded shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
          }}
        >
          <span className={`text-lg font-bold ${
            allOptions[currentIndex + 1] === 'FAKER' ? 'text-red-500' : 'text-green-500'
          }`}>
            {allOptions[currentIndex + 1] || finalRole}
          </span>
        </div>
      </div>
    </div>
  );
}
