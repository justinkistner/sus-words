'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function TestRealtime() {
  const [logs, setLogs] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [testRoomId, setTestRoomId] = useState<string>('');
  const supabase = createClient();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Create a test room
  const createTestRoom = async () => {
    try {
      addLog('Creating test room...');
      
      // First create a test player to use as host
      const testPlayerId = crypto.randomUUID();
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          id: testPlayerId,
          name: 'Test Host Player'
        })
        .select()
        .single();
      
      if (playerError) {
        addLog(`Error creating test player: ${playerError.message}`);
        return;
      }
      
      addLog(`Test player created: ${playerData.id}`);
      
      // Now create the room with the player as host
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: 'Test Realtime Room',
          host_id: testPlayerId,
          current_phase: 'lobby',
          current_round: 1,
          total_rounds: 5,
          time_per_clue: 60,
          time_per_vote: 30,
          game_mode: 'classic'
        })
        .select()
        .single();

      if (error) {
        addLog(`Error creating room: ${error.message}`);
        return;
      }

      addLog(`Room created successfully: ${data.id}`);
      setTestRoomId(data.id);
      return data.id;
    } catch (err) {
      addLog(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Set up realtime subscription
  const setupRealtimeSubscription = async (roomId: string) => {
    addLog(`Setting up realtime subscription for room: ${roomId}`);
    
    // Clean up existing channel
    if (channel) {
      addLog('Cleaning up existing channel...');
      await channel.unsubscribe();
    }

    // Create new channel
    const newChannel = supabase.channel(`test-channel-${roomId}`);
    
    // Test 1: Basic broadcast (should work)
    newChannel.on('broadcast', { event: 'test' }, (payload) => {
      addLog(`✅ Broadcast received: ${JSON.stringify(payload)}`);
    });

    // Test 2: Postgres changes on rooms table
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      (payload) => {
        addLog(`🎯 ROOMS postgres_changes received: ${JSON.stringify(payload)}`);
      }
    );

    // Test 3: Postgres changes on room_players table
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        addLog(`🎯 ROOM_PLAYERS postgres_changes received: ${JSON.stringify(payload)}`);
      }
    );

    // Test 4: Listen to ALL changes (no filter)
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms'
      },
      (payload) => {
        addLog(`🌍 ANY ROOM postgres_changes received: ${JSON.stringify(payload)}`);
      }
    );

    // Subscribe to the channel
    addLog('Subscribing to channel...');
    newChannel.subscribe((status) => {
      addLog(`Channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        addLog('✅ Successfully subscribed to channel');
        
        // Send test broadcast after subscription
        setTimeout(() => {
          addLog('Sending test broadcast...');
          newChannel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Test broadcast', timestamp: Date.now() }
          });
        }, 1000);
      } else if (status === 'CHANNEL_ERROR') {
        addLog('❌ Channel subscription error');
      }
    });

    setChannel(newChannel);
  };

  // Test database operations
  const testDatabaseOperations = async () => {
    if (!testRoomId) {
      addLog('No test room ID available');
      return;
    }

    addLog('--- Starting database operations test ---');

    // Test 1: Update room
    addLog('Test 1: Updating room...');
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ name: `Updated at ${new Date().toLocaleTimeString()}` })
      .eq('id', testRoomId);
    
    if (updateError) {
      addLog(`Update error: ${updateError.message}`);
    } else {
      addLog('Room updated successfully');
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Insert player
    addLog('Test 2: Inserting player...');
    const playerId = crypto.randomUUID(); 
    const { error: insertError } = await supabase
      .from('room_players')
      .insert({
        room_id: testRoomId,
        player_id: playerId,
        is_host: false,
        is_ready: false,
        score: 0
      });
    
    if (insertError) {
      addLog(`Insert error: ${insertError.message}`);
    } else {
      addLog('Player inserted successfully');
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Update player
    addLog('Test 3: Updating player...');
    const { error: updatePlayerError } = await supabase
      .from('room_players')
      .update({ is_ready: true })
      .eq('room_id', testRoomId)
      .eq('player_id', playerId);
    
    if (updatePlayerError) {
      addLog(`Update player error: ${updatePlayerError.message}`);
    } else {
      addLog('Player updated successfully');
    }

    addLog('--- Database operations test complete ---');
  };

  // Check database configuration
  const checkDatabaseConfig = async () => {
    addLog('--- Checking database configuration ---');
    
    // Simple check: try to fetch from tables to verify access
    addLog('Checking table access...');
    
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .limit(1);
    
    if (roomsError) {
      addLog(`❌ Cannot access rooms table: ${roomsError.message}`);
    } else {
      addLog(`✅ Can access rooms table`);
    }
    
    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('room_id')
      .limit(1);
    
    if (playersError) {
      addLog(`❌ Cannot access room_players table: ${playersError.message}`);
    } else {
      addLog(`✅ Can access room_players table`);
    }
    
    addLog('--- Configuration check complete ---');
    addLog('Note: Run the SQL queries in supabase/debug_realtime.sql in your Supabase SQL editor for detailed configuration info');
  };

  // Initialize test
  const initializeTest = async () => {
    addLog('=== Starting Realtime Test ===');
    const roomId = await createTestRoom();
    if (roomId && typeof roomId === 'string') {
      await setupRealtimeSubscription(roomId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Supabase Realtime Test</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={initializeTest}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Initialize Test
        </button>
        
        <button
          onClick={testDatabaseOperations}
          disabled={!testRoomId}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded ml-4 disabled:opacity-50"
        >
          Test Database Operations
        </button>
        
        <button
          onClick={checkDatabaseConfig}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded ml-4"
        >
          Check Database Config
        </button>
        
        <button
          onClick={() => setLogs([])}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded ml-4"
        >
          Clear Logs
        </button>
      </div>

      {testRoomId && (
        <div className="mb-4 p-4 bg-gray-800 rounded">
          <p>Test Room ID: <span className="font-mono">{testRoomId}</span></p>
        </div>
      )}

      <div className="bg-gray-800 rounded p-4">
        <h2 className="text-xl font-semibold mb-4">Logs:</h2>
        <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className={
              log.includes('✅') ? 'text-green-400' :
              log.includes('❌') ? 'text-red-400' :
              log.includes('🎯') ? 'text-yellow-400' :
              log.includes('🌍') ? 'text-blue-400' :
              'text-gray-300'
            }>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
