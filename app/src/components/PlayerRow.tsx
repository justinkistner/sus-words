'use client';

import { ReactNode } from 'react';

interface PlayerRowProps {
  playerId: string;
  playerName: string;
  isCurrentPlayer?: boolean;
  isActivePlayer?: boolean; // For turn-based phases
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
}

export function PlayerRow({
  playerId,
  playerName,
  isCurrentPlayer = false,
  isActivePlayer = false,
  leftContent,
  centerContent,
  rightContent
}: PlayerRowProps) {
  return (
    <div 
      className={`
        flex items-center justify-between gap-4 p-4 rounded-lg transition-all duration-200
        ${isActivePlayer 
          ? 'bg-slate-500' 
          : 'bg-slate-600'
        }
      `}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {leftContent}
      </div>

      {/* Center section - takes remaining space */}
      {centerContent && (
        <div className="flex-1">
          {centerContent}
        </div>
      )}

      {/* Right section */}
      {rightContent && (
        <div className="flex items-center gap-2 ml-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
}
