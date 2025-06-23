'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function JoinGame() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode || !playerName) {
      setError('Please fill in all required fields');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Check if room exists
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomCode)
        .single();

      if (roomError) {
        setError('Room not found. Please check the room code.');
        setIsJoining(false);
        return;
      }

      if (!roomData.is_active) {
        setError('This game has already ended.');
        setIsJoining(false);
        return;
      }

      if (roomData.current_phase !== 'lobby') {
        setError('This game has already started.');
        setIsJoining(false);
        return;
      }

      // Create a player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([{ name: playerName }])
        .select()
        .single();

      if (playerError) throw playerError;

      // Add player to room_players
      const { error: roomPlayerError } = await supabase
        .from('room_players')
        .insert([
          {
            room_id: roomCode,
            player_id: playerData.id,
            is_host: false,
            is_ready: false
          }
        ]);

      if (roomPlayerError) throw roomPlayerError;

      // Store player ID in local storage for session management
      localStorage.setItem('playerId', playerData.id);
      localStorage.setItem('playerName', playerName);

      // Redirect to lobby
      router.push(`/lobby/${roomCode}`);
    } catch (err: any) {
      console.error('Error joining game:', err);
      setError(err.message || 'Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      <div className="w-full max-w-md bg-slate-800/70 p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
          Join Game
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleJoinGame} className="space-y-6">
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
            <label htmlFor="roomCode" className="block text-sm font-medium text-slate-300 mb-1">
              Room Code*
            </label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full p-3 bg-slate-700 rounded border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter room code"
              required
            />
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
              disabled={isJoining}
              className="w-1/2 p-3 bg-cyan-600 hover:bg-cyan-700 rounded text-white transition-colors flex justify-center items-center"
            >
              {isJoining ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
              ) : (
                'Join Game'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
