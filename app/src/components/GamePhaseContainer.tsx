'use client';

import { ReactNode } from 'react';

interface GamePhaseContainerProps {
  title: string;
  subtitle?: string;
  phase: string;
  children: ReactNode;
  currentPlayerRole?: 'player' | 'faker' | null;
  showRole?: boolean;
  isAnimating?: boolean;
  animationPhase?: 'idle' | 'spinning' | 'slowing' | 'done';
  slotPosition?: number;
  flipped?: boolean;
  flipCount?: number;
}

export function GamePhaseContainer({ 
  title, 
  subtitle, 
  phase,
  children,
  currentPlayerRole,
  showRole = false,
  isAnimating = false,
  animationPhase = 'idle',
  slotPosition = 0,
  flipped = false,
  flipCount = 0
}: GamePhaseContainerProps) {
  console.log('🎴 GamePhaseContainer Badge Debug:', {
    phase,
    currentPlayerRole,
    showRole,
    isAnimating,
    animationPhase,
    slotPosition,
    flipped,
    flipCount,
    shouldShowBadge: showRole && currentPlayerRole,
    shouldShowAnimation: phase === 'roleAssignment' && isAnimating,
    willShowFlipAnimation: phase === 'roleAssignment' && !showRole,
    badgeCondition: ((showRole && currentPlayerRole) || (phase === 'roleAssignment' && currentPlayerRole)),
    animationCondition: phase === 'roleAssignment' && !showRole,
    willRenderAnimation: phase === 'roleAssignment' && currentPlayerRole,
    backFaceOpacity: flipped ? 0 : 1,
    frontFaceOpacity: flipped ? 1 : 0,
    backFaceTransform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg)`,
    frontFaceTransform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg) rotateX(180deg)`
  });
  
  return (
    <div 
      className="bg-slate-700 rounded-lg p-6 space-y-4 transition-all duration-300 ease-in-out relative"
      data-phase={phase}
    >
      {/* Role Badge in Upper Right */}
      {((showRole && currentPlayerRole) || (phase === 'roleAssignment' && currentPlayerRole) || (phase === 'wordReveal' && currentPlayerRole)) && (
        <div className="absolute top-6 right-6">
          {(() => {
            const shouldShowAnimation = phase === 'wordReveal' && currentPlayerRole && !showRole;
            console.log('🎯 Badge rendering decision:', {
              phase,
              currentPlayerRole,
              showRole,
              isAnimating,
              shouldShowAnimation,
              willRenderAnimation: shouldShowAnimation,
              willRenderStatic: !shouldShowAnimation
            });
            return shouldShowAnimation;
          })() ? (
            // 3D Flip Card Animation - matching final badge size
            <div 
              className="relative px-4 py-2 min-w-[80px] h-[36px]"
              style={{ perspective: '600px' }}
            >
              {/* Back face - Shows opposite role and flips with the card */}
              <div
                className={`
                  absolute inset-0 w-full h-full rounded-lg flex items-center justify-center font-bold text-xs
                  ${
                    currentPlayerRole === 'faker'
                      ? 'bg-green-600 text-white'  // Show PLAYER when final is FAKER
                      : 'bg-red-600 text-white'    // Show FAKER when final is PLAYER
                  }
                `}
                style={{
                  transform: `perspective(600px) rotateX(${flipCount * 180}deg)`,
                  backfaceVisibility: 'hidden',
                  transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
                }}
              >
                {/* This text is FIXED to the back face and rotates with it */}
                {currentPlayerRole === 'faker' ? 'PLAYER' : 'FAKER'}
              </div>
              
              {/* Front face - Shows final role and flips with the card */}
              <div
                className={`
                  absolute inset-0 w-full h-full rounded-lg flex items-center justify-center font-bold text-xs
                  ${
                    currentPlayerRole === 'faker'
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                  }
                `}
                style={{
                  transform: `perspective(600px) rotateX(${flipCount * 180 + 180}deg)`,
                  backfaceVisibility: 'hidden',
                  transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
                }}
              >
                {/* This text is FIXED to the front face and rotates with it */}
                {currentPlayerRole?.toUpperCase()}
              </div>
            </div>
          ) : (
            // Static role badge after animation - only show if not in spoiler prevention window
            (phase !== 'wordReveal' || showRole) && (
              <div className={`
                px-4 py-2 rounded-lg text-sm font-bold
                ${currentPlayerRole === 'faker' 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' 
                  : 'bg-green-600 text-white shadow-lg shadow-green-900/50'
                }
              `}>
                {currentPlayerRole?.toUpperCase()}
              </div>
            )
          )}
        </div>
      )}
      
      {/* Header Section - Left Aligned */}
      <div className="text-left space-y-1">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-gray-300 text-sm">{subtitle}</p>
        )}
      </div>
      
      {/* Content Section */}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
