'use client';

import { useState, useEffect } from 'react';

export default function TestFlipPage() {
  const [flipped, setFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const [finalRole, setFinalRole] = useState<'PLAYER' | 'FAKER'>('PLAYER');

  const startAnimation = () => {
    setIsAnimating(true);
    setFlipCount(0);
    setFlipped(false); // Start with back face showing
    
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
      if (count < totalFlips) {
        setFlipped(prev => !prev);
        count++;
        setFlipCount(count);
        
        const delay = getFlipDelay(count);
        console.log(`Flip ${count}/${totalFlips}, delay: ${delay.toFixed(0)}ms`);
        setTimeout(doFlip, delay);
      } else {
        // Final state - show the front face with final role
        setFlipped(true);
        setIsAnimating(false);
        console.log('Animation complete, showing final role:', finalRole);
      }
    };
    
    doFlip();
  };

  const toggleRole = () => {
    setFinalRole(prev => prev === 'PLAYER' ? 'FAKER' : 'PLAYER');
  };

  return (
    <div className="min-h-screen bg-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Flip Animation Test</h1>
        
        {/* Controls */}
        <div className="mb-8 space-x-4">
          <button
            onClick={startAnimation}
            disabled={isAnimating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium"
          >
            {isAnimating ? 'Animating...' : 'Start Flip Animation'}
          </button>
          
          <button
            onClick={toggleRole}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
          >
            Toggle Role: {finalRole}
          </button>
        </div>

        {/* Debug Info */}
        <div className="mb-8 p-4 bg-slate-700 rounded text-white">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <p>isAnimating: {isAnimating.toString()}</p>
          <p>flipped: {flipped.toString()}</p>
          <p>flipCount: {flipCount}</p>
          <p>finalRole: {finalRole}</p>
        </div>

        {/* Test Container - 3D Flip Card (Like CodeSandbox) */}
        <div className="bg-slate-700 rounded-lg p-6 relative">
          <h2 className="text-2xl font-bold text-white mb-4">3D Flip Card Test</h2>
          
          {/* 3D Flip Card - EXACT same concept as CodeSandbox */}
          <div className="absolute top-6 right-6">
            <div 
              className="relative w-20 h-12 cursor-pointer"
              style={{ perspective: '600px' }}
            >
              {/* Back face - Shows opposite role and flips with the card */}
              <div
                className={`
                  absolute inset-0 w-full h-full rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-300
                  ${
                    finalRole === 'FAKER'
                      ? 'bg-green-600 text-white'  // Show PLAYER when final is FAKER
                      : 'bg-red-600 text-white'    // Show FAKER when final is PLAYER
                  }
                `}
                style={{
                  opacity: flipped ? 0 : 1,
                  transform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg)`,
                  backfaceVisibility: 'hidden'
                }}
              >
                {/* This text is FIXED to the back face and rotates with it */}
                {finalRole === 'FAKER' ? 'PLAYER' : 'FAKER'}
              </div>
              
              {/* Front face - Shows final role and flips with the card */}
              <div
                className={`
                  absolute inset-0 w-full h-full rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-300
                  ${
                    finalRole === 'FAKER'
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                  }
                `}
                style={{
                  opacity: flipped ? 1 : 0,
                  transform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg) rotateX(180deg)`,
                  backfaceVisibility: 'hidden'
                }}
              >
                {/* This text is FIXED to the front face and rotates with it */}
                {finalRole}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="mt-12 text-white">
            <p>This is the EXACT 3D flip animation from the CodeSandbox example.</p>
            <p>Click "Start Flip Animation" to see it flip 5 times with rotateX and opacity changes.</p>
          </div>
        </div>

        {/* Manual Toggle Test */}
        <div className="mt-8 bg-slate-700 rounded-lg p-6 relative">
          <h2 className="text-2xl font-bold text-white mb-4">Manual Toggle Test</h2>
          
          {/* Manual flip toggle */}
          <div className="absolute top-6 right-6">
            <div 
              className="relative w-20 h-12 cursor-pointer"
              style={{ perspective: '600px' }}
              onClick={() => setFlipped(!flipped)}
            >
              {/* Back face */}
              <div
                className="absolute inset-0 w-full h-full bg-slate-600 text-gray-300 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-500"
                style={{
                  opacity: flipped ? 0 : 1,
                  transform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg)`,
                  backfaceVisibility: 'hidden'
                }}
              >
                ???
              </div>
              
              {/* Front face */}
              <div
                className={`
                  absolute inset-0 w-full h-full rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-500
                  ${
                    finalRole === 'FAKER'
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                  }
                `}
                style={{
                  opacity: flipped ? 1 : 0,
                  transform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg) rotateX(180deg)`,
                  backfaceVisibility: 'hidden'
                }}
              >
                {finalRole}
              </div>
            </div>
          </div>

          <div className="mt-12 text-white">
            <p>Click the card in the top-right to manually test the flip animation.</p>
            <p>This uses the exact same CSS transforms as the CodeSandbox example.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
