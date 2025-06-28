'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    async function checkState() {
      const playerId = localStorage.getItem('playerId');
      const playerName = localStorage.getItem('playerName');
      
      const supabase = createClient();
      
      // Get latest room
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const room = rooms?.[0];
      
      // Get players if room exists
      let players = [];
      if (room) {
        const { data } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', room.id);
        players = data || [];
      }
      
      setDebugInfo({
        localStorage: {
          playerId,
          playerName
        },
        room: room ? {
          id: room.id,
          currentPhase: room.current_phase,
          currentTurnPlayerId: room.current_turn_player_id
        } : null,
        players: players.map(p => ({
          id: p.player_id,
          name: p.player_name,
          turnOrder: p.turn_order,
          isCurrentTurn: p.player_id === room?.current_turn_player_id
        })),
        playerMatch: players.find(p => p.player_id === playerId)
      });
    }
    
    checkState();
  }, []);
  
  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      <pre className="bg-gray-800 p-4 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <div className="mt-4 space-y-2">
        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          Clear localStorage and Reload
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded ml-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
