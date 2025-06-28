'use client';

import { useState } from 'react';
import { GamePhaseContainer } from './GamePhaseContainer';
import { Player } from '@/types/game';

interface UnifiedFakerGuessPhaseProps {
  currentPlayerId: string;
  players: Player[];
  isFaker: boolean;
  wordGrid: string[];
  secretWord?: string;
  onGuessSubmit: (guess: string) => void;
  isSubmittingGuess: boolean;
  hasSubmittedGuess: boolean;
  currentPlayerRole: 'player' | 'faker' | null;
  playerClues: Record<string, string>;
}

export function UnifiedFakerGuessPhase({
  currentPlayerId,
  players,
  isFaker,
  wordGrid,
  secretWord,
  onGuessSubmit,
  isSubmittingGuess,
  hasSubmittedGuess,
  currentPlayerRole,
  playerClues
}: UnifiedFakerGuessPhaseProps) {
  const [selectedWord, setSelectedWord] = useState<string>('');

  const handleSubmit = () => {
    if (selectedWord && !isSubmittingGuess && !hasSubmittedGuess) {
      onGuessSubmit(selectedWord);
    }
  };

  return (
    <GamePhaseContainer
      title="Faker's Last Chance"
      subtitle={isFaker ? "You were caught! Guess the secret word to steal the win" : "The faker is guessing the secret word..."}
      phase="fakerGuess"
      currentPlayerRole={currentPlayerRole}
      showRole={true}
    >
      {isFaker ? (
        <div className="space-y-6">
          {/* Show clues given by players */}
          {Object.keys(playerClues).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Clues given:</h3>
              <div className="space-y-2">
                {players
                  .filter(p => playerClues[p.id])
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-slate-700 px-4 py-2 rounded-lg">
                      <span className="text-gray-300">{player.name}</span>
                      <span className="text-blue-400 font-medium">{playerClues[player.id]}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Select the word you think was the secret word:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {wordGrid.map((word, index) => (
              <button
                key={index}
                onClick={() => !hasSubmittedGuess && setSelectedWord(word)}
                disabled={hasSubmittedGuess || isSubmittingGuess}
                className={`p-3 rounded-lg font-medium transition-all ${
                  selectedWord === word
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-slate-600 hover:bg-slate-500 text-gray-200'
                } ${hasSubmittedGuess || isSubmittingGuess ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {word}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!selectedWord || isSubmittingGuess || hasSubmittedGuess}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmittingGuess ? 'Submitting...' : hasSubmittedGuess ? 'Guess Submitted' : 'Submit Guess'}
            </button>
          </div>

          {hasSubmittedGuess && (
            <div className="text-center text-gray-400">
              Waiting for results...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <div className="inline-block w-2 h-2 bg-blue-400 rounded-full mx-1"></div>
            <div className="inline-block w-2 h-2 bg-blue-400 rounded-full mx-1 animation-delay-200"></div>
            <div className="inline-block w-2 h-2 bg-blue-400 rounded-full mx-1 animation-delay-400"></div>
          </div>
          <p className="text-gray-300">
            Waiting for the faker to make their guess...
          </p>
        </div>
      )}
    </GamePhaseContainer>
  );
}
