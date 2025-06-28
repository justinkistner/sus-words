'use client';

import { useEffect, useState } from 'react';
import { Toast } from './Toast';

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
  const [clueError, setClueError] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  // Validate clue input
  const validateClue = (value: string): string => {
    if (value.length > 24) {
      return 'Clues must be 24 characters or less';
    }
    if (value.includes(' ') || value.split(/\s+/).length > 1) {
      return 'Clues can only be a single word';
    }
    return '';
  };
  
  // Handle clue input change with validation
  const handleClueChange = (value: string) => {
    const error = validateClue(value);
    setClueError(error);
    
    // Only update the clue if it's valid or empty (to allow deletion)
    if (!error || value === '') {
      onClueChange(value);
    }
  };
  
  // Find current turn player and determine if it's my turn
  const currentTurnPlayer = players.find(p => p.id === currentTurnPlayerId);
  const isMyTurn = currentPlayerId === currentTurnPlayerId;
  
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
  
  // Debug clue data
  useEffect(() => {
    console.log('TurnBasedClueGiving - playerClues:', playerClues);
  }, [playerClues]);

  // Call onRevealComplete when component mounts if not already revealed
  useEffect(() => {
    if (!hasRevealedRole) {
      onRevealComplete();
    }
  }, [hasRevealedRole, onRevealComplete]);
  
  // Show toast when clue is submitted
  useEffect(() => {
    if (hasSubmittedClue && isMyTurn) {
      setShowToast(true);
    }
  }, [hasSubmittedClue, isMyTurn]);
  
  // Early debug check
  if (!currentPlayerId) {
    console.error('TurnBasedClueGiving: No currentPlayerId provided!');
    return (
      <div className="p-4 bg-red-600/20 border border-red-600 rounded-lg">
        <p className="text-red-400">Error: Player identity not established. Please refresh the page.</p>
      </div>
    );
  }
  
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
  
  // Additional debug for turn order display
  console.log('Turn Order Debug:', {
    sortedPlayers: players.map(p => ({
      id: p.id,
      name: p.name,
      isMe: p.id === currentPlayerId,
      isCurrent: p.id === currentTurnPlayerId,
      displayName: p.id === currentPlayerId ? 'You' : p.name
    }))
  });
  
  // Sort players by turn order
  const sortedPlayers = [...players].sort((a, b) => {
    const aIndex = players.indexOf(a);
    const bIndex = players.indexOf(b);
    return aIndex - bIndex;
  });
  
  // Sort clues by submission order
  const sortedClues = [...playerClues].sort((a, b) => 
    (a.submissionOrder || 0) - (b.submissionOrder || 0)
  );
  
  // Handle form submission with toast
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClueSubmit(e);
  };
  
  // Show turn-based clue giving UI
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Toast notification */}
      {showToast && (
        <Toast 
          message="Clue submitted successfully!" 
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      
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
        
        {/* Turn order with integrated clues */}
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const playerClue = playerClues.find(pc => pc.playerId === player.id);
            const hasSubmitted = !!playerClue;
            const isCurrent = player.id === currentTurnPlayerId;
            const isMe = player.id === currentPlayerId;
            
            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                  ${isCurrent && !hasSubmitted ? 'bg-blue-600/20 border border-blue-600' : 
                    hasSubmitted ? 'bg-slate-700/50' : 
                    'bg-slate-800/50'}
                `}
              >
                <div className={`
                  min-w-[80px] text-sm font-medium
                  ${isCurrent && !hasSubmitted ? 'text-blue-400' : 
                    hasSubmitted ? 'text-green-400' : 
                    'text-gray-400'}
                `}>
                  {isMe ? 'You' : player.name}
                  {hasSubmitted && ' ✓'}
                </div>
                
                {/* Show clue input inline for current player */}
                {isCurrent && isMe && !hasSubmitted && (
                  <div className="flex-1">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={clue}
                        onChange={(e) => handleClueChange(e.target.value)}
                        maxLength={24}
                        className={`flex-1 px-3 py-1 bg-slate-700 border rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm ${
                          clueError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-blue-500'
                        }`}
                        placeholder="Enter your clue (single word)..."
                        disabled={isSubmittingClue}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!clue.trim() || isSubmittingClue || !!clueError}
                        className="px-4 py-1 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {isSubmittingClue ? '...' : 'Submit'}
                      </button>
                    </form>
                    {clueError && (
                      <div className="text-red-400 text-xs mt-1">
                        {clueError}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show submitted clue */}
                {hasSubmitted && playerClue && (
                  <div className="flex-1 text-sm text-gray-300">
                    "{playerClue.clue}"
                  </div>
                )}
                
                {/* Show waiting status for other players */}
                {isCurrent && !isMe && !hasSubmitted && (
                  <div className="flex-1 text-sm text-gray-500 italic">
                    Thinking...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
