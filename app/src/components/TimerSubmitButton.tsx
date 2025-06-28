'use client';

import { useEffect, useState } from 'react';

interface TimerSubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  timeLimit: number; // in seconds
  startTime: number; // timestamp when turn started
}

export function TimerSubmitButton({
  onClick,
  disabled = false,
  isSubmitting = false,
  timeLimit,
  startTime
}: TimerSubmitButtonProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeRemaining(remaining);
      setProgress((remaining / timeLimit) * 100);
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [timeLimit, startTime]);

  return (
    <button
      onClick={onClick}
      disabled={disabled || isSubmitting}
      className={`relative px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all transform hover:scale-105 overflow-hidden ${
        timeRemaining < 5 && timeRemaining > 0 ? 'animate-pulse' : ''
      }`}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-blue-400 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
      
      {/* Red overlay when time is low */}
      {timeRemaining < 5 && timeRemaining > 0 && (
        <div className="absolute inset-0 bg-red-500 opacity-20" />
      )}
      
      {/* Button text */}
      <span className="relative z-10">
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </span>
    </button>
  );
}
