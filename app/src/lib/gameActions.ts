import { createClient } from './supabase';

// Type definitions for better type safety
interface Vote {
  voter_id: string;
  voted_for_id: string;
  round_number: number;
}

interface Player {
  player_id: string;
  role?: string;
  turn_order?: number;
}

interface Word {
  word: string;
}

interface RoomData {
  host_id: string;
  button_holder_index?: number;
  current_turn_player_id?: string;
  turn_started_at?: string;
  current_round?: number;
}

interface RoundData {
  secret_word: string;
}

interface Category {
  id: number;
  name: string;
}

interface GameRound {
  faker_guess: string;
}

interface Clue {
  player_id: string;
  round_number: number;
  clue_text: string;
  submission_order?: number;
  submitted_at?: string;
}

interface ScoreUpdate {
  playerId: string;
  points: number;
}

export async function leaveGame(roomId: string, playerId: string): Promise<{ success: boolean; error?: string; newHostId?: string; gameReset?: boolean }> {
  const supabase = createClient();
  const MINIMUM_PLAYERS = 3;
  
  try {
    // First, get current room and player data
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('host_id, current_phase, current_round')
      .eq('id', roomId)
      .single();
      
    if (roomError) throw new Error(roomError.message);
    
    const { data: allPlayers, error: playersError } = await supabase
      .from('room_players')
      .select('player_id, is_host')
      .eq('room_id', roomId);
      
    if (playersError) throw new Error(playersError.message);
    
    const wasHost = (roomData as RoomData).host_id === playerId;
    const remainingPlayerCount = (allPlayers?.length || 1) - 1; // -1 because we're removing this player
    // A game is in progress if it's not in lobby/waiting states
    const isGameInProgress = (roomData as any).current_phase !== 'waiting' && (roomData as any).current_phase !== 'lobby';
    
    console.log('🚪 Player leaving:', {
      playerId,
      wasHost,
      remainingPlayerCount,
      isGameInProgress,
      currentPhase: (roomData as any).current_phase
    });
    
    // Remove player from room_players
    const { error: removeError } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', playerId);
      
    if (removeError) throw new Error(removeError.message);
    
    // Scenario 1: Last player leaving - delete room
    if (remainingPlayerCount === 0) {
      console.log('🗑️ Last player leaving, deleting room');
      
      const { error: deleteRoomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);
        
      if (deleteRoomError) throw new Error(deleteRoomError.message);
      
      return { success: true };
    }
    
    // Scenario 2: Below minimum players - reset to lobby (regardless of game state)
    if (remainingPlayerCount < MINIMUM_PLAYERS) {
      console.log('🔄 Below minimum players during game, resetting to lobby');
      
      // Reset room to lobby state
      const { error: resetError } = await supabase
        .from('rooms')
        .update({
          current_phase: 'waiting',
          current_round: 1,
          button_holder_index: null,
          current_turn_player_id: null,
          turn_started_at: null
        })
        .eq('id', roomId);
        
      if (resetError) throw new Error(resetError.message);
      
      // Clear game data
      await Promise.all([
        supabase.from('clues').delete().eq('room_id', roomId),
        supabase.from('votes').delete().eq('room_id', roomId),
        supabase.from('game_rounds').delete().eq('room_id', roomId),
        supabase.from('room_players').update({ 
          score: 0, 
          role: null, 
          turn_order: null,
          is_ready_for_clues: false
        }).eq('room_id', roomId)
      ]);
      
      // Handle host reassignment if needed
      let newHostId = null;
      if (wasHost) {
        const { data: remainingPlayers } = await supabase
          .from('room_players')
          .select('player_id')
          .eq('room_id', roomId)
          .limit(1);
          
        if (remainingPlayers && remainingPlayers.length > 0) {
          newHostId = (remainingPlayers as Player[])[0].player_id;
          
          await Promise.all([
            supabase.from('rooms').update({ host_id: newHostId }).eq('id', roomId),
            supabase.from('room_players').update({ is_host: true }).eq('room_id', roomId).eq('player_id', newHostId)
          ]);
        }
      }
      
      return { success: true, newHostId: newHostId || undefined, gameReset: true };
    }
    
    // Scenario 3: Handle host reassignment (game continues)
    let newHostId = null;
    if (wasHost) {
      console.log('👑 Host left, assigning new host');
      
      const { data: remainingPlayers } = await supabase
        .from('room_players')
        .select('player_id')
        .eq('room_id', roomId)
        .limit(1);
        
      if (remainingPlayers && remainingPlayers.length > 0) {
        newHostId = (remainingPlayers as Player[])[0].player_id;
        
        await Promise.all([
          supabase.from('rooms').update({ host_id: newHostId }).eq('id', roomId),
          supabase.from('room_players').update({ is_host: true }).eq('room_id', roomId).eq('player_id', newHostId)
        ]);
        
        console.log('✅ New host assigned:', newHostId);
      }
    }
    
    // Scenario 4: If game in progress, remove player from turn order and active game data
    if (isGameInProgress) {
      console.log('🎮 Removing player from active game');
      
      // Remove player's clues and votes for current game
      await Promise.all([
        supabase.from('clues').delete().eq('room_id', roomId).eq('player_id', playerId),
        supabase.from('votes').delete().eq('room_id', roomId).eq('voter_id', playerId),
        supabase.from('votes').delete().eq('room_id', roomId).eq('voted_for_id', playerId)
      ]);
      
      // Update turn order if this player was in the current turn sequence
      const { data: currentRoom } = await supabase
        .from('rooms')
        .select('current_turn_player_id, button_holder_index')
        .eq('id', roomId)
        .single();
        
      if (currentRoom && (currentRoom as any).current_turn_player_id === playerId) {
        // If it was this player's turn, advance to next player
        await advanceToNextTurn(roomId);
      }
    }
    
    return { success: true, newHostId: newHostId || undefined, gameReset: false };
  } catch (error) {
    console.error('Error leaving game:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to leave game';
    return { success: false, error: errorMessage };
  }
}

export async function endGame(roomId: string, hostId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // First verify that the player is actually the host
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();
      
    if (roomError) throw new Error(roomError.message);
    
    if ((roomData as RoomData).host_id !== hostId) {
      return { success: false, error: 'Only the host can end the game' };
    }
    
    // Update the room to 'ended' phase (different from 'finished' which shows scores)
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ current_phase: 'ended' })
      .eq('id', roomId);
      
    if (updateError) throw new Error(updateError.message);
    
    return { success: true };
  } catch (error) {
    console.error('Error ending game:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to end game';
    return { success: false, error: errorMessage };
  }
}

export async function submitVote(
  roomId: string, 
  voterId: string, 
  votedForId: string,
  roundNumber: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  console.log('submitVote called with:', { roomId, voterId, votedForId, roundNumber });
  
  try {
    // Insert the vote (use upsert to handle duplicates)
    const { error: voteError } = await supabase
      .from('votes')
      .upsert({
        room_id: roomId,
        voter_id: voterId,
        voted_for_id: votedForId,
        round_number: roundNumber
      }, {
        onConflict: 'room_id,voter_id,round_number'
      });
      
    if (voteError) {
      console.error('Vote insertion error:', voteError);
      throw new Error(voteError.message);
    }
    
    console.log('Vote inserted successfully');
    
    // Check if all players have voted
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id')
      .eq('room_id', roomId);
      
    if (playersError) throw new Error(playersError.message);
    
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id, voted_for_id')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber);
      
    if (votesError) throw new Error(votesError.message);
    
    console.log('Phase transition check:', {
      playerCount: players?.length,
      voteCount: votes?.length,
      shouldTransition: players && votes && players.length === votes.length
    });
    
    // If all players have voted, transition to results phase
    if (players && votes && players.length === votes.length) {
      console.log('All votes are in, checking if faker was caught...');
      
      // Count votes to see who got the most
      const voteCount: Record<string, number> = {};
      for (const vote of (votes as Vote[]) || []) {
        voteCount[vote.voted_for_id] = (voteCount[vote.voted_for_id] || 0) + 1;
      }
      
      // Find who got the most votes
      let mostVotedId = '';
      let maxVotes = 0;
      Object.entries(voteCount).forEach(([playerId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          mostVotedId = playerId;
        }
      });
      
      // Check if the faker was caught
      const { data: fakerData, error: fakerError } = await supabase
        .from('room_players')
        .select('player_id')
        .eq('room_id', roomId)
        .eq('role', 'faker')
        .single();
        
      if (fakerError) {
        console.error('Error finding faker:', fakerError);
      }
      
      const fakerWasCaught = fakerData && mostVotedId === fakerData.player_id;
      const nextPhase = fakerWasCaught ? 'fakerGuess' : 'results';
      
      console.log(`Transitioning to ${nextPhase} phase...`);
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_phase: nextPhase })
        .eq('id', roomId);
        
      if (updateError) {
        console.error(`Failed to transition to ${nextPhase} phase:`, updateError);
        throw new Error(updateError.message);
      }
      console.log(`Successfully transitioned to ${nextPhase} phase`);
      
      // If going straight to results (faker not caught), calculate scores
      // Do NOT calculate scores if going to fakerGuess - wait for faker's guess first
      if (nextPhase === 'results') {
        await calculateAndUpdateScores(roomId, roundNumber);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting vote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit vote';
    return { success: false, error: errorMessage };
  }
}

export async function submitClue(
  roomId: string,
  playerId: string,
  clueText: string,
  roundNumber: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  console.log('submitClue function called with:', {
    roomId,
    playerId,
    clueText,
    roundNumber,
    clueTextType: typeof clueText,
    clueTextLength: clueText?.length
  });
  
  try {
    // Verify it's this player's turn
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('current_turn_player_id, current_phase')
      .eq('id', roomId)
      .single();
      
    if (roomError) throw new Error(roomError.message);
    if (!room) throw new Error('Room not found');
    
    if (room.current_phase !== 'clueGiving') {
      throw new Error('Not in clue giving phase');
    }
    
    if (room.current_turn_player_id !== playerId) {
      throw new Error('Not your turn');
    }
    
    // Get submission order
    const { count, error: countError } = await supabase
      .from('clues')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('round_number', roundNumber);
      
    if (countError) throw new Error(countError.message);
    
    const submissionOrder = (count || 0) + 1;
    
    console.log('About to insert clue with data:', {
      room_id: roomId,
      player_id: playerId,
      round_number: roundNumber,
      clue_text: clueText,
      submission_order: submissionOrder,
      submitted_at: new Date().toISOString()
    });
    
    // Insert clue with submission order
    const { error: insertError } = await supabase
      .from('clues')
      .insert({
        room_id: roomId,
        player_id: playerId,
        round_number: roundNumber,
        clue_text: clueText,
        submission_order: submissionOrder,
        submitted_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Error inserting clue:', insertError);
      throw new Error(insertError.message);
    }
    
    // Advance to next turn
    await advanceToNextTurn(roomId);
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting clue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit clue';
    return { success: false, error: errorMessage };
  }
}

export async function calculateAndUpdateScores(
  roomId: string,
  roundNumber: number,
  isCorrect?: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // Get all players and their roles
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id, role')
      .eq('room_id', roomId);
      
    if (playersError) throw new Error(playersError.message);
    
    // Get all votes for this round
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id, voted_for_id')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber);
      
    if (votesError) throw new Error(votesError.message);
    
    // Calculate who got the most votes
    const voteCount: Record<string, number> = {};
    (players as Player[])?.forEach(p => voteCount[p.player_id] = 0);
    for (const vote of (votes as Vote[]) || []) {
      voteCount[vote.voted_for_id] = (voteCount[vote.voted_for_id] || 0) + 1;
    }
    
    const fakerId = (players as Player[])?.find(p => p.role === 'faker')?.player_id as string | undefined;
    const maxVotes = Math.max(...Object.values(voteCount));
    const mostVotedId = Object.entries(voteCount).find(([_, count]) => count === maxVotes)?.[0];
    
    // Determine scoring based on voting outcome
    const fakerWonVote = mostVotedId === fakerId;
    
    // Calculate scores for each player
    const scoreUpdates: ScoreUpdate[] = [];
    
    if (fakerWonVote) {
      // Faker was caught
      if (isCorrect) {
        // Faker guessed the word correctly, give them 1 point
        if (fakerId) {
          scoreUpdates.push({ playerId: fakerId, points: 1 });
        }
      } else {
        // Faker failed to guess the word, players who voted for faker get 2 points
        (votes as Vote[])?.forEach(vote => {
          if (vote.voted_for_id === fakerId) {
            scoreUpdates.push({ playerId: vote.voter_id, points: 2 });
          }
        });
      }
    } else {
      // Faker escaped - faker gets 2 points
      if (fakerId) {
        scoreUpdates.push({ playerId: fakerId, points: 2 });
      }
    }
    
    // Update scores in database
    for (const update of scoreUpdates) {
      try {
        const { data, error: updateError } = await supabase.rpc('increment_player_score', {
          p_room_id: roomId,
          p_player_id: update.playerId,
          p_points: update.points
        });
        
        if (updateError) {
          console.error(`Error updating score for player "${update.playerId}":`, updateError);
          // Continue with other updates even if one fails
        } else {
          console.log(`Successfully updated score for player ${update.playerId}: +${update.points} points`);
        }
      } catch (err) {
        console.error(`Exception updating score for player "${update.playerId}":`, err);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error calculating scores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to calculate scores';
    return { success: false, error: errorMessage };
  }
}

export async function submitFakerGuess(
  roomId: string,
  fakerId: string,
  guess: string,
  roundNumber: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // Get the secret word for this round
    const { data: roundData, error: roundError } = await supabase
      .from('game_rounds')
      .select('secret_word')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber)
      .single();
      
    if (roundError) throw new Error(roundError.message);
    
    const secretWord = (roundData as RoundData).secret_word;
    const isCorrect = guess.toLowerCase().trim() === secretWord?.toLowerCase().trim();
    
    console.log(`Faker guessed "${guess}", secret word was "${secretWord}", correct: ${isCorrect}`);
    
    // Store the faker's guess in the game_rounds table
    const { error: updateError } = await supabase
      .from('game_rounds')
      .update({ faker_guess: guess })
      .eq('room_id', roomId)
      .eq('round_number', roundNumber);
      
    if (updateError) throw new Error(updateError.message);
    
    // Transition to results phase
    const { error: phaseError } = await supabase
      .from('rooms')
      .update({ current_phase: 'results' })
      .eq('id', roomId);
      
    if (phaseError) throw new Error(phaseError.message);
    
    // Calculate scores with faker's guess result
    await calculateAndUpdateScores(roomId, roundNumber, isCorrect);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting faker guess:', error);
    return { success: false, error: error.message };
  }
}

export async function startNextRound(roomId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    console.log('Starting next round for room:', roomId);
    
    // Get current room data
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('current_round, total_rounds, category, button_holder_index')
      .eq('id', roomId)
      .single();
      
    if (roomError) {
      console.error('Error fetching room data:', roomError);
      throw new Error(`Failed to fetch room data: ${roomError.message}`);
    }
    
    if (!room) {
      throw new Error('Room not found');
    }
    
    const nextRound = ((room.current_round as number) || 0) + 1;
    console.log('Current round:', room.current_round, 'Next round:', nextRound, 'Total rounds:', room.total_rounds);
    
    // Check if game should end
    if (nextRound > (room.total_rounds as number)) {
      // Game is over, transition to finished state
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_phase: 'finished' })
        .eq('id', roomId);
        
      if (updateError) {
        console.error('Error updating room to finished state:', updateError);
        throw new Error(`Failed to end game: ${updateError.message}`);
      }
      
      return { success: true };
    }
    
    // Get all players in turn order
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id, turn_order')
      .eq('room_id', roomId)
      .order('turn_order', { ascending: true });
      
    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }
    
    if (!players || players.length < 3) {
      throw new Error(`Not enough players to continue (found ${players?.length || 0} players)`);
    }
    
    // Rotate button holder for next round
    const currentButtonIndex = (room.button_holder_index as number) || 0;
    const nextButtonIndex = (currentButtonIndex + 1) % players.length;
    
    // Select a new faker randomly
    const randomIndex = Math.floor(Math.random() * players.length);
    const newFakerId = (players as any[])[randomIndex].player_id;
    console.log('New faker selected:', newFakerId);
    
    // Determine first player based on button holder
    const firstPlayerId = (players as any[])[nextButtonIndex].player_id;
    
    // First get the category ID
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', room.category as string)
      .single();
      
    if (categoryError) {
      console.error('Error fetching category:', categoryError);
      throw new Error(`Failed to fetch category: ${categoryError.message}`);
    }
    
    if (!category) {
      throw new Error(`Category "${room.category}" not found`);
    }
    
    // Get new words for the grid
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('word')
      .eq('category_id', (category as Category).id)
      .limit(16);
      
    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      throw new Error(`Failed to fetch words: ${wordsError.message}`);
    }
    
    if (!words || words.length < 16) {
      throw new Error(`Not enough words in category "${room.category}" (found ${words?.length || 0} words)`);
    }
    
    // Shuffle and select words
    const shuffled = (words as Word[]).sort(() => Math.random() - 0.5);
    const wordGrid = shuffled.slice(0, 16).map(w => w.word);
    const secretWord = wordGrid[Math.floor(Math.random() * wordGrid.length)];
    console.log('New secret word selected');
    
    // Start a transaction to update everything atomically
    // First, reset player roles and clear ready state
    const { error: resetRolesError } = await supabase
      .from('room_players')
      .update({ 
        role: 'regular',
        is_ready_for_clues: false
      })
      .eq('room_id', roomId);
      
    if (resetRolesError) {
      console.error('Error resetting roles:', resetRolesError);
      throw new Error(`Failed to reset player roles: ${resetRolesError.message}`);
    }
    
    // Set new faker
    const { error: setFakerError } = await supabase
      .from('room_players')
      .update({ role: 'faker' })
      .eq('room_id', roomId)
      .eq('player_id', newFakerId);
      
    if (setFakerError) {
      console.error('Error setting faker:', setFakerError);
      throw new Error(`Failed to set new faker: ${setFakerError.message}`);
    }
    
    // Create new game round entry BEFORE updating room
    const { error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        room_id: roomId,
        round_number: nextRound,
        faker_id: newFakerId,
        secret_word: secretWord
      });
      
    if (roundError) {
      console.error('Error creating game round:', roundError);
      throw new Error(`Failed to create game round: ${roundError.message}`);
    }
    
    // Small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // First update to wordReveal phase for role assignment animation
    const { error: wordRevealUpdateError } = await supabase
      .from('rooms')
      .update({
        current_phase: 'wordReveal',
        current_round: nextRound,
        word_grid: wordGrid,
        secret_word: secretWord,
        button_holder_index: nextButtonIndex,
        current_turn_player_id: firstPlayerId,
        turn_started_at: new Date().toISOString()
      })
      .eq('id', roomId);
      
    if (wordRevealUpdateError) {
      console.error('Error updating room to wordReveal:', wordRevealUpdateError);
      throw new Error(`Failed to update room to wordReveal: ${wordRevealUpdateError.message}`);
    }
    
    console.log('Room updated to wordReveal phase');
    console.log('Players will use Ready buttons to proceed to clue giving phase');
    
    // Clean up old clues and votes from previous rounds
    const { error: cleanupCluesError } = await supabase
      .from('clues')
      .delete()
      .eq('room_id', roomId)
      .lt('round_number', nextRound);
      
    if (cleanupCluesError) console.error('Error cleaning up old clues:', cleanupCluesError);
    
    const { error: cleanupVotesError } = await supabase
      .from('votes')
      .delete()
      .eq('room_id', roomId)
      .lt('round_number', nextRound);
      
    if (cleanupVotesError) console.error('Error cleaning up old votes:', cleanupVotesError);
    
    console.log('Successfully started next round');
    return { success: true };
  } catch (error) {
    console.error('Error starting next round:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to start next round';
    return { success: false, error: errorMessage };
  }
}

// New function to initialize turn order when game starts
export async function initializeTurnOrder(roomId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id')
      .eq('room_id', roomId);
      
    if (playersError) throw new Error(playersError.message);
    if (!players || players.length === 0) throw new Error('No players found');
    
    // Shuffle players for random turn order
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Update each player with their turn order
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const { error: updateError } = await supabase
        .from('room_players')
        .update({ turn_order: i })
        .eq('room_id', roomId)
        .eq('player_id', (shuffledPlayers[i] as any).player_id);
        
      if (updateError) throw new Error(updateError.message);
    }
    
    // Set initial button holder (index 0)
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ 
        button_holder_index: 0,
        current_turn_player_id: (shuffledPlayers[0] as any).player_id,
        turn_started_at: new Date().toISOString()
      })
      .eq('id', roomId);
      
    if (roomUpdateError) throw new Error(roomUpdateError.message);
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing turn order:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to initialize turn order' };
  }
}

// New function to advance to next turn
export async function advanceToNextTurn(roomId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // Get current room state
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('current_turn_player_id, current_round')
      .eq('id', roomId)
      .single();
      
    if (roomError) throw new Error(roomError.message);
    if (!room) throw new Error('Room not found');
    
    const currentRound = room.current_round as number;
    
    // Get all players in turn order
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id, turn_order')
      .eq('room_id', roomId)
      .order('turn_order', { ascending: true });
      
    if (playersError) throw new Error(playersError.message);
    if (!players || players.length === 0) throw new Error('No players found');
    
    // Find current player index
    const currentIndex = players.findIndex(p => (p as any).player_id === room.current_turn_player_id);
    if (currentIndex === -1) throw new Error('Current player not found');
    
    // Check if all players have submitted clues
    const { data: clues, error: cluesError } = await supabase
      .from('clues')
      .select('player_id')
      .eq('room_id', roomId)
      .eq('round_number', currentRound);
      
    if (cluesError) throw new Error(cluesError.message);
    
    // If all players have submitted clues, move to voting phase
    if (clues && clues.length >= players.length) {
      const { error: phaseError } = await supabase
        .from('rooms')
        .update({ 
          current_phase: 'voting',
          current_turn_player_id: null,
          turn_started_at: null
        })
        .eq('id', roomId);
        
      if (phaseError) throw new Error(phaseError.message);
      return { success: true };
    }
    
    // Find next player who hasn't submitted a clue
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    
    while (attempts < players.length) {
      const nextPlayerId = (players[nextIndex] as any).player_id;
      const hasSubmitted = clues?.some(c => (c as any).player_id === nextPlayerId);
      
      if (!hasSubmitted) {
        // Update room with next player's turn
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ 
            current_turn_player_id: nextPlayerId,
            turn_started_at: new Date().toISOString()
          })
          .eq('id', roomId);
          
        if (updateError) throw new Error(updateError.message);
        return { success: true };
      }
      
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    
    // This shouldn't happen, but if it does, move to voting
    const { error: phaseError } = await supabase
      .from('rooms')
      .update({ 
        current_phase: 'voting',
        current_turn_player_id: null,
        turn_started_at: null
      })
      .eq('id', roomId);
      
    if (phaseError) throw new Error(phaseError.message);
    return { success: true };
    
  } catch (error) {
    console.error('Error advancing turn:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to advance turn' };
  }
}

export async function viewFinalScores(roomId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // Check if the game is in a valid state to view final scores
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('current_phase, current_round, total_rounds')
      .eq('id', roomId)
      .single();
      
    if (roomError) throw new Error(roomError.message);
    
    const room = roomData as { current_phase: string; current_round: number; total_rounds: number };
    
    // Only allow viewing final scores if the game has completed all rounds
    if (room.current_round < room.total_rounds) {
      return { success: false, error: 'Game is not finished yet' };
    }
    
    // Only allow transition from results phase to finished phase
    if (room.current_phase !== 'results') {
      return { success: false, error: 'Can only view final scores after results phase' };
    }
    
    // Update the room to 'finished' phase to show final scores
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ current_phase: 'finished' })
      .eq('id', roomId);
      
    if (updateError) throw new Error(updateError.message);
    
    return { success: true };
  } catch (error) {
    console.error('Error viewing final scores:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to view final scores' 
    };
  }
}

// Function to restart the game and return players to lobby
export async function restartGame(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    console.log('🔄 Restarting game for room:', roomId);
    
    // Reset room to waiting phase with fresh state
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({
        current_phase: 'waiting',
        current_round: 1,
        button_holder_index: null,
        current_turn_player_id: null,
        turn_started_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);
    
    if (roomUpdateError) {
      console.error('Error resetting room:', roomUpdateError);
      throw new Error(`Failed to reset room: ${roomUpdateError.message}`);
    }
    
    // Reset all players to not ready and clear roles
    const { error: playersUpdateError } = await supabase
      .from('players')
      .update({
        is_ready: false,
        role: null,
        turn_order: null,
        score: 0,
        is_ready_for_clues: false,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId);
    
    if (playersUpdateError) {
      console.error('Error resetting players:', playersUpdateError);
      throw new Error(`Failed to reset players: ${playersUpdateError.message}`);
    }
    
    // Clear all game data (votes, clues, rounds)
    const { error: votesDeleteError } = await supabase
      .from('votes')
      .delete()
      .eq('room_id', roomId);
    
    if (votesDeleteError) {
      console.error('Error clearing votes:', votesDeleteError);
      // Don't throw here, continue with cleanup
    }
    
    const { error: cluesDeleteError } = await supabase
      .from('clues')
      .delete()
      .eq('room_id', roomId);
    
    if (cluesDeleteError) {
      console.error('Error clearing clues:', cluesDeleteError);
      // Don't throw here, continue with cleanup
    }
    
    const { error: roundsDeleteError } = await supabase
      .from('game_rounds')
      .delete()
      .eq('room_id', roomId);
    
    if (roundsDeleteError) {
      console.error('Error clearing rounds:', roundsDeleteError);
      // Don't throw here, continue with cleanup
    }
    
    console.log('✅ Game successfully restarted, players returned to lobby');
    
    return { success: true };
    
  } catch (error) {
    console.error('Error restarting game:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to restart game' 
    };
  }
}
