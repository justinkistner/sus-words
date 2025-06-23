'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function CreateGame() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [rounds, setRounds] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !playerName) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      console.log('Creating player with name:', playerName);
      
      // Create a player first
      const playerResult = await supabase
        .from('players')
        .insert([{ name: playerName }])
        .select();
      
      console.log('Player creation result:', playerResult);
      
      if (playerResult.error) {
        console.error('Player creation error:', playerResult.error);
        throw new Error(`Player creation failed: ${playerResult.error.message}`);
      }
      
      if (!playerResult.data || playerResult.data.length === 0) {
        throw new Error('Player was created but no data was returned');
      }
      
      const playerData = playerResult.data[0];
      console.log('Player created successfully:', playerData);

      // Create a new room
      console.log('Creating room with name:', name);
      const roomResult = await supabase
        .from('rooms')
        .insert([
          { 
            name, 
            host_id: playerData.id,
            total_rounds: rounds,
            game_mode: 'classic'
          }
        ])
        .select();
      
      console.log('Room creation result:', roomResult);
      
      if (roomResult.error) {
        console.error('Room creation error:', roomResult.error);
        throw new Error(`Room creation failed: ${roomResult.error.message}`);
      }
      
      if (!roomResult.data || roomResult.data.length === 0) {
        throw new Error('Room was created but no data was returned');
      }
      
      const roomData = roomResult.data[0];
      console.log('Room created successfully:', roomData);

      // Add player to room_players as host
      console.log('Adding player to room as host');
      const roomPlayerResult = await supabase
        .from('room_players')
        .insert([
          {
            room_id: roomData.id,
            player_id: playerData.id,
            is_host: true,
            is_ready: true
          }
        ]);
      
      console.log('Room player creation result:', roomPlayerResult);
      
      if (roomPlayerResult.error) {
        console.error('Room player creation error:', roomPlayerResult.error);
        throw new Error(`Adding player to room failed: ${roomPlayerResult.error.message}`);
      }

      // Store player ID in local storage for session management
      localStorage.setItem('playerId', playerData.id);
      localStorage.setItem('playerName', playerName);

      // Redirect to lobby
      console.log('Redirecting to lobby:', `/lobby/${roomData.id}`);
      router.push(`/lobby/${roomData.id}`);
    } catch (err: any) {
      console.error('Error creating game:', err);
      setError(err.message || 'Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      <div className="w-full max-w-md bg-slate-800/70 p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
          Create New Game
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateGame} className="space-y-6">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-1">
              Your Name*
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-slate-300 mb-1">
              Room Name*
            </label>
            <input
              type="text"
              id="roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter room name"
              required
            />
          </div>

          <div>
            <label htmlFor="rounds" className="block text-sm font-medium text-slate-300 mb-1">
              Number of Rounds
            </label>
            <select
              id="rounds"
              value={rounds}
              onChange={(e) => setRounds(parseInt(e.target.value))}
              className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value={1}>1 Round</option>
              <option value={2}>2 Rounds</option>
              <option value={3}>3 Rounds</option>
              <option value={5}>5 Rounds</option>
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-1/2 p-3 bg-slate-600 hover:bg-slate-700 rounded text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="w-1/2 p-3 bg-indigo-600 hover:bg-indigo-700 rounded text-white transition-colors flex justify-center items-center"
            >
              {isCreating ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
              ) : (
                'Create Game'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
