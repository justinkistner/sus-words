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
}

interface Word {
  word: string;
}

interface RoomData {
  host_id: string;
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
}

interface ScoreUpdate {
  playerId: string;
  points: number;
}

export async function leaveGame(roomId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    // Remove player from room_players
    const { error: removeError } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', playerId);
      
    if (removeError) throw new Error(removeError.message);
    
    // Check if this player was the host
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();
      
    if (roomError) throw new Error(roomError.message);
    
    // If the leaving player was the host, we need to handle it
    if ((roomData as RoomData).host_id === playerId) {
      // Check if there are other players
      const { data: remainingPlayers, error: playersError } = await supabase
        .from('room_players')
        .select('player_id')
        .eq('room_id', roomId);
        
      if (playersError) throw new Error(playersError.message);
      
      if (remainingPlayers && remainingPlayers.length > 0) {
        // Assign a new host (first remaining player)
        const newHostId = (remainingPlayers as Player[])[0].player_id;
        
        // Update room with new host
        const { error: updateRoomError } = await supabase
          .from('rooms')
          .update({ host_id: newHostId })
          .eq('id', roomId);
          
        if (updateRoomError) throw new Error(updateRoomError.message);
        
        // Update room_players to mark new host
        const { error: updateHostError } = await supabase
          .from('room_players')
          .update({ is_host: true })
          .eq('room_id', roomId)
          .eq('player_id', newHostId);
          
        if (updateHostError) throw new Error(updateHostError.message);
      } else {
        // No players left, delete the room
        const { error: deleteRoomError } = await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);
          
        if (deleteRoomError) throw new Error(deleteRoomError.message);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    
    return { success: true };
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
  
  try {
    // Insert the clue
    const { error: clueError } = await supabase
      .from('clues')
      .insert({
        room_id: roomId,
        player_id: playerId,
        round_number: roundNumber,
        clue_text: clueText
      });
      
    if (clueError) throw new Error(clueError.message);
    
    // Check if all players have submitted clues
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id')
      .eq('room_id', roomId);
      
    if (playersError) throw new Error(playersError.message);
    
    const { data: clues, error: cluesError } = await supabase
      .from('clues')
      .select('player_id')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber);
      
    if (cluesError) throw new Error(cluesError.message);
    
    console.log('Phase transition check:', {
      playerCount: players?.length,
      clueCount: clues?.length,
      shouldTransition: players && clues && players.length === clues.length
    });
    
    // If all players have submitted clues, transition to voting phase
    if (players && clues && players.length === clues.length) {
      console.log('Transitioning to voting phase...');
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_phase: 'voting' })
        .eq('id', roomId);
        
      if (updateError) {
        console.error('Failed to transition to voting phase:', updateError);
        throw new Error(updateError.message);
      }
      console.log('Successfully transitioned to voting phase');
    }
    
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
      .select('current_round, total_rounds, category')
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
    
    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_id')
      .eq('room_id', roomId);
      
    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }
    
    if (!players || players.length < 3) {
      throw new Error(`Not enough players to continue (found ${players?.length || 0} players)`);
    }
    
    // Select a new faker randomly
    const randomIndex = Math.floor(Math.random() * players.length);
    const newFakerId = (players as Player[])[randomIndex].player_id;
    console.log('New faker selected:', newFakerId);
    
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
    // First, reset player roles
    const { error: resetRolesError } = await supabase
      .from('room_players')
      .update({ role: 'regular' })
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
    
    // NOW update room state - this will trigger clients to fetch the new round data
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({
        current_phase: 'clueGiving',
        current_round: nextRound,
        word_grid: wordGrid,
        secret_word: secretWord
      })
      .eq('id', roomId);
      
    if (roomUpdateError) {
      console.error('Error updating room:', roomUpdateError);
      throw new Error(`Failed to update room: ${roomUpdateError.message}`);
    }
    
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
