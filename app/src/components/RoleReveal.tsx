'use client';

import { useEffect, useState } from 'react';

interface RoleRevealProps {
  isFaker: boolean;
  secretWord?: string;
  onRevealComplete?: () => void;
  clue: string;
  onClueChange: (clue: string) => void;
  onClueSubmit: (e: React.FormEvent) => void;
  hasSubmittedClue: boolean;
  isSubmittingClue: boolean;
}

export default function RoleReveal({ 
  isFaker, 
  secretWord, 
  onRevealComplete,
  clue,
  onClueChange,
  onClueSubmit,
  hasSubmittedClue,
  isSubmittingClue
}: RoleRevealProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasRevealed, setHasRevealed] = useState(false);
  
  // Options to flip through
  const flipOptions = [
    'PLAYER',
    'FAKER',
    'PLAYER',
    'FAKER',
    'PLAYER',
    'FAKER',
    'PLAYER',
    'FAKER',
  ];
  
  // Add the final role at the end
  const finalRole = isFaker ? 'FAKER' : 'PLAYER';
  const allOptions = [...flipOptions, finalRole];
  
  useEffect(() => {
    if (!isAnimating || hasRevealed) return;
    
    let flipCount = 0;
    const totalFlips = flipOptions.length;
    
    const flipInterval = setInterval(() => {
      flipCount++;
      setCurrentIndex(flipCount);
      
      if (flipCount >= totalFlips) {
        clearInterval(flipInterval);
        setIsAnimating(false);
        setHasRevealed(true);
        
        // Notify parent after reveal
        setTimeout(() => {
          onRevealComplete?.();
        }, 500);
      }
    }, 200); // 200ms per flip
    
    return () => clearInterval(flipInterval);
  }, [isAnimating, hasRevealed, flipOptions.length, onRevealComplete]);
  
  const currentOption = allOptions[currentIndex];
  const isShowingFinalRole = !isAnimating && currentOption === finalRole;
  
  return (
    <div className="mb-8 p-6 bg-slate-700 rounded-lg">
      <div className="flex items-center gap-8">
        {/* Flip Board Container - Left Side */}
        <div className="flex-shrink-0">
          <div className="relative" style={{ width: '300px', height: '100px', perspective: '1000px' }}>
            {/* 3D Flip Card */}
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transition: isAnimating ? 'transform 0.2s' : 'transform 0.6s ease-out',
                transform: `rotateX(${currentIndex * 180}deg)`,
              }}
            >
              {/* Front Face */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-slate-800 rounded-lg shadow-lg"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(0deg)',
                }}
              >
                <span className={`text-4xl font-bold ${
                  currentOption === 'FAKER' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {currentOption}
                </span>
              </div>
              
              {/* Back Face */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-slate-800 rounded-lg shadow-lg"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(180deg)',
                }}
              >
                <span className={`text-4xl font-bold ${
                  allOptions[currentIndex + 1] === 'FAKER' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {allOptions[currentIndex + 1] || finalRole}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Clue Input Form - Right Side */}
        {isShowingFinalRole && !hasSubmittedClue && (
          <div className="flex-1 animate-fadeIn">
            <form onSubmit={onClueSubmit}>
              <label className="block text-lg font-medium mb-3">
                {isFaker 
                  ? "Try to blend in by giving a one word clue that matches the other players."
                  : "Give a one-word clue that relates to your secret word."
                }
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={clue}
                  onChange={(e) => onClueChange(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your clue..."
                  required
                  disabled={isSubmittingClue}
                />
                <button
                  type="submit"
                  disabled={!clue.trim() || isSubmittingClue}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  {isSubmittingClue ? 'Submitting...' : 'Submit'}
                </button>
              </div>
              <p className="text-sm text-gray-400">
                {isFaker 
                  ? "Look at the word grid below and figure out what the secret word might be!"
                  : "Your secret word will be highlighted in green below."
                }
              </p>
            </form>
          </div>
        )}
        
        {/* Submitted Clue Display */}
        {isShowingFinalRole && hasSubmittedClue && (
          <div className="flex-1 animate-fadeIn">
            <div className="text-center">
              <div className="mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-lg font-semibold text-green-400 mb-2">
                Your clue has been submitted!
              </p>
              <p className="text-gray-300">
                Waiting for other players...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
