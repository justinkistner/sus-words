import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
  }
  
  const supabase = createClient();
  
  // Get raw clues data
  const { data: clues, error } = await supabase
    .from('clues')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Also get the clues with player info
  const { data: cluesWithPlayers, error: joinError } = await supabase
    .from('clues')
    .select(`
      id,
      room_id,
      player_id,
      round_number,
      clue_text,
      submission_order,
      created_at,
      players (
        id,
        name
      )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
    
  return NextResponse.json({
    rawClues: clues,
    cluesWithPlayers: cluesWithPlayers,
    error: joinError?.message
  });
}
