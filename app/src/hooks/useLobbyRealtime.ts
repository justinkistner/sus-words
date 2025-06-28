import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLobbyData } from './useLobbyData';
import { Player, PlayerRole } from '@/types/game';
import { createClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseLobbyRealtimeReturn {
  // Data state
  room: any;
  players: Player[];
  isLoading: boolean;
  error: string | null;
  isHost: boolean;
  isReady: boolean;
  // Connection state
  isConnected: boolean;
  connectionError: Error | null;
  // Actions
  setIsHost: (isHost: boolean) => void;
  setIsReady: (isReady: boolean) => void;
  refreshData: () => Promise<void>;
}

/**
 * Combined hook that manages both lobby data and realtime subscriptions.
 * Provides a clean interface for the lobby component.
 */
export function useLobbyRealtime(roomId: string): UseLobbyRealtimeReturn {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  
  // Manage lobby data
  const {
    room,
    players,
    isLoading,
    error,
    isHost,
    isReady,
    setRoom,
    setIsHost,
    setIsReady,
    updatePlayer,
    addPlayer,
    removePlayer,
    refreshData
  } = useLobbyData(roomId);

  // Manage realtime subscription state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Set up realtime subscription
  useEffect(() => {
    console.log('Setting up lobby realtime subscription for room:', roomId);
    
    // Clean up any existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    // Create channel
    const channel = supabase.channel(`lobby:${roomId}`);
    channelRef.current = channel;

    // Helper function to handle player data from realtime events
    const handlePlayerFromRealtimeData = (playerData: any): Player => {
      return {
        id: playerData.player_id,
        name: playerData.players?.name || 'Unknown Player',
        isHost: Boolean(playerData.is_host),
        isReady: Boolean(playerData.is_ready),
        score: playerData.score || 0,
        role: 'regular' as PlayerRole
      };
    };

    // Set up event handlers BEFORE subscribing (like in the working test page)
    
    // Handle room_players changes
    const roomPlayersHandler = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      },
      async (payload: any) => {
        console.log('🎯 ROOM PLAYERS CHANGE RECEIVED:', payload);
        console.log('Event type:', payload.eventType);
        console.log('Payload details:', JSON.stringify(payload, null, 2));
        
        try {
          if (payload.eventType === 'INSERT') {
            // New player joined - need to fetch their details
            console.log('New player joined, refreshing data');
            await refreshData();
          } else if (payload.eventType === 'UPDATE') {
            // Player updated (ready status, etc.)
            const updatedPlayerData = payload.new;
            const player = handlePlayerFromRealtimeData(updatedPlayerData);
            updatePlayer(player.id, {
              isHost: player.isHost,
              isReady: player.isReady,
              score: player.score
            });
            
            // Update current player's status if it's them
            const currentPlayerId = localStorage.getItem('playerId');
            if (currentPlayerId === player.id) {
              setIsHost(player.isHost);
              setIsReady(player.isReady);
            }
          } else if (payload.eventType === 'DELETE') {
            // Player left - payload.old only contains the room_players table id
            const roomPlayersId = payload.old.id;
            console.log(`🚪 Room player record ${roomPlayersId} deleted`);
            console.log('DELETE payload:', payload.old);
            
            // Since we don't have player_id in the DELETE payload, refresh data to get updated list
            // Use setTimeout to avoid setState during render
            setTimeout(() => {
              console.log('Refreshing data after player left');
              refreshData();
            }, 0);
          }
        } catch (error) {
          console.error('Error handling player change:', error);
        }
      }
    );
    
    console.log('Room players handler registered:', roomPlayersHandler);

    // Handle room changes
    const roomChangesHandler = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      (payload: any) => {
        console.log('🚀 ROOM UPDATE RECEIVED:', payload);
        console.log('Event type:', payload.eventType);
        console.log('Payload details:', JSON.stringify(payload, null, 2));
        
        try {
          if (payload.eventType === 'UPDATE') {
            const updatedRoomData = payload.new;
            
            // Normalize the room data
            const normalizedRoom = {
              id: updatedRoomData.id,
              name: updatedRoomData.name,
              hostId: updatedRoomData.host_id,
              createdAt: updatedRoomData.created_at,
              currentPhase: updatedRoomData.current_phase,
              currentRound: updatedRoomData.current_round,
              totalRounds: updatedRoomData.total_rounds,
              secretWord: updatedRoomData.secret_word,
              wordGrid: updatedRoomData.word_grid,
              category: updatedRoomData.category,
              timePerClue: updatedRoomData.time_per_clue,
              timePerVote: updatedRoomData.time_per_vote,
              gameMode: updatedRoomData.game_mode || 'classic',
              players: []
            };
            
            console.log('Normalized room data:', normalizedRoom);
            
            // Update room data
            setRoom(normalizedRoom);
            
            // Check if game phase changed to redirect
            if (normalizedRoom.currentPhase !== 'lobby') {
              console.log('🎮 Game phase changed, redirecting to game');
              router.push(`/game/${roomId}`);
            }
          }
        } catch (error) {
          console.error('Error handling room change:', error);
        }
      }
    );
    
    console.log('Room changes handler registered:', roomChangesHandler);

    // Test broadcast handler
    channel.on('broadcast', { event: 'test' }, (payload: any) => {
      console.log('Test broadcast received:', payload);
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Lobby channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to lobby channel');
        setIsConnected(true);
        setConnectionError(null);
        
        // Send test broadcast after subscription
        setTimeout(() => {
          console.log('Sending test broadcast...');
          channel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Test from lobby', timestamp: Date.now() }
          });
        }, 1000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Failed to subscribe to lobby channel');
        setIsConnected(false);
        setConnectionError(new Error('Failed to subscribe to lobby channel'));
      } else if (status === 'CLOSED') {
        console.log('Channel closed');
        setIsConnected(false);
      }
    });

    // Cleanup
    return () => {
      console.log('Cleaning up lobby realtime subscription');
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [roomId]);

  return {
    // Data state
    room,
    players,
    isLoading,
    error,
    isHost,
    isReady,
    // Connection state
    isConnected,
    connectionError,
    // Actions
    setIsHost,
    setIsReady,
    refreshData
  };
}
