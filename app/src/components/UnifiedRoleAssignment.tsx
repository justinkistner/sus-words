'use client';

import { useState, useEffect } from 'react';
import { GamePhaseContainer } from './GamePhaseContainer';
import { PlayerRow } from './PlayerRow';
import { Player } from '@/types/game';
import { createClient } from '@/lib/supabase';

interface UnifiedRoleAssignmentProps {
  players: Player[];
  currentPlayerId: string;
  turnOrder: string[];
  buttonHolderIndex: number;
  currentPlayerRole: 'player' | 'faker' | null;
  onRevealRole: () => void;
  hasRevealedRole: boolean;
  roomId: string;
}

export function UnifiedRoleAssignment({
  players,
  currentPlayerId,
  turnOrder,
  buttonHolderIndex,
  currentPlayerRole,
  onRevealRole,
  hasRevealedRole,
  roomId
}: UnifiedRoleAssignmentProps) {
  const [showRole, setShowRole] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayText, setDisplayText] = useState(0); // Now tracks position in the slot
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'spinning' | 'slowing' | 'done'>('idle');
  const [flipped, setFlipped] = useState(false);
  const [flipCount, setFlipCount] = useState(0);

  // Final role
  const finalRole = currentPlayerRole === 'faker' ? 'FAKER' : 'PLAYER';
  // Determine final position based on role (even = PLAYER, odd = FAKER)
  const finalPosition = finalRole === 'PLAYER' ? 28 : 29;

  // Debug logging
  console.log('🎮 UnifiedRoleAssignment Debug:', {
    hasRevealedRole,
    currentPlayerRole,
    isAnimating,
    animationPhase,
    displayText,
    showRole,
    finalPosition,
    flipped,
    flipCount,
    shouldStartAnimation: currentPlayerRole && !isAnimating && !showRole,
    willTriggerAnimation: !!currentPlayerRole && !isAnimating && !showRole,
    animationConditions: {
      hasCurrentPlayerRole: !!currentPlayerRole,
      notAnimating: !isAnimating,
      notShowingRole: !showRole,
      allConditionsMet: !!currentPlayerRole && !isAnimating && !showRole
    }
  });

  // 3D Flip animation with quadratic easing - like slot machine
  useEffect(() => {
    console.log('🔍 Animation useEffect triggered:', {
      currentPlayerRole,
      isAnimating,
      showRole,
      hasRevealedRole,
      willStartAnimation: currentPlayerRole && !isAnimating && !showRole
    });
    
    // Force animation to start in wordReveal phase, regardless of hasRevealedRole
    if (currentPlayerRole && !isAnimating && !showRole) {
      console.log('🎰 STARTING 3D FLIP ANIMATION WITH QUADRATIC EASING!');
      setIsAnimating(true);
      setAnimationPhase('spinning');
      setFlipped(false); // Start with back face showing
      setFlipCount(0);
      
      let count = 0;
      const totalFlips = 8; // More flips for better easing effect
      
      // Quadratic easing function - starts fast, slows down
      const getFlipDelay = (flipIndex: number) => {
        const progress = flipIndex / totalFlips;
        // Quadratic ease-out: fast start, slow end
        const easedProgress = 1 - Math.pow(1 - progress, 2);
        // Map to delay: 50ms (very fast) to 600ms (slow)
        return 50 + (easedProgress * 550);
      };
      
      const doFlip = () => {
        console.log(`🎴 DOING FLIP ${count + 1}/${totalFlips}`);
        if (count < totalFlips) {
          setFlipped(prev => {
            console.log(`🔄 Flipping from ${prev} to ${!prev}`);
            return !prev;
          });
          count++;
          setFlipCount(count);
          setDisplayText(count);
          
          const delay = getFlipDelay(count);
          console.log(`⏱️ Next flip in ${delay.toFixed(0)}ms`);
          setTimeout(doFlip, delay);
        } else {
          // Final state - show the front face with final role
          console.log('🏁 ANIMATION COMPLETE - Setting final state');
          setFlipped(true);
          setAnimationPhase('done');
          setIsAnimating(false);
          setShowRole(true);
          onRevealRole();
          console.log('🎉 3D flip animation complete, role revealed:', finalRole);
        }
      };
      
      // Start the animation
      setTimeout(doFlip, 100); // Small delay to ensure state is set
    }
  }, [currentPlayerRole, isAnimating, showRole, hasRevealedRole, onRevealRole, finalRole]);

  // Get player's turn position
  const getPlayerTurnPosition = (playerId: string) => {
    const index = turnOrder.indexOf(playerId);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <GamePhaseContainer
      title="Role Assignment"
      subtitle={isAnimating ? "Your role will be revealed automatically" : "Ready to start giving clues?"}
      phase="wordReveal"
      currentPlayerRole={currentPlayerRole}
      showRole={showRole}
      isAnimating={isAnimating}
      animationPhase={animationPhase}
      slotPosition={displayText}
      flipped={flipped}
      flipCount={flipCount}
    >
      {turnOrder?.map((playerId, index) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return null;

        const turnPosition = getPlayerTurnPosition(playerId);
        const isCurrentPlayer = playerId === currentPlayerId;

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
              isCurrentPlayer && !hasRevealedRole ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                  <span className="text-sm text-blue-400">Revealing role...</span>
                </div>
              ) : null
            }
            rightContent={
              isCurrentPlayer && hasRevealedRole ? (
                <div className="text-sm text-green-400">Ready</div>
              ) : (
                <div className="text-sm text-gray-500">Waiting</div>
              )
            }
          />
        );
      })}

      {/* Instructions based on role - only show after animation completes */}
      {!isAnimating && showRole && currentPlayerRole && (
        <div className="mt-4 p-4 rounded-lg text-center transition-all duration-300 bg-slate-600 border border-slate-500">
          <p className="text-sm mb-3 text-slate-200">
            {currentPlayerRole === 'faker' 
              ? "You're the FAKER! Try to blend in by giving clues that make it seem like you know the secret word."
              : "You're a PLAYER! Give clues about the secret word to help identify the faker."
            }
          </p>
          
          {/* Ready Button */}
          <button
            onClick={async () => {
              try {
                console.log('Ready button clicked - marking player as ready...');
                const supabase = createClient();
                
                // Mark this player as ready in the room_players table
                const { error } = await supabase
                  .from('room_players')
                  .update({ is_ready_for_clues: true })
                  .eq('room_id', roomId)
                  .eq('player_id', currentPlayerId);
                  
                if (error) {
                  console.error('Error marking player as ready:', error);
                } else {
                  console.log('Successfully marked player as ready');
                }
              } catch (error) {
                console.error('Error in ready button:', error);
              }
            }}
            className={`
              px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105
              ${currentPlayerRole === 'faker'
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/50'
                : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/50'
              }
            `}
          >
            Ready to Start!
          </button>
        </div>
      )}
    </GamePhaseContainer>
  );
}
