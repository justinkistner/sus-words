# Sus Words Game Research

## Reel Fling Game Analysis

### Overview
Reel Fling is a multiplayer movie guessing game built with Next.js, React, TypeScript, Tailwind CSS, and Supabase. It offers both single-player and multiplayer modes with real-time functionality.

### Key Features
- **Single-player Mode**: Different difficulty levels with varying guesses and hints
- **Multiplayer Mode**: Lobby system, round-based gameplay, real-time scoring
- **In-game Chat**: Communication between players
- **User Authentication**: With hCaptcha protection against bots
- **Dark/Light Mode**: UI theme options
- **Responsive Design**: Works across device sizes

### Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Authentication, Realtime)
- **APIs**: TMDB API for movie data
- **Deployment**: Vercel
- **Security**: hCaptcha for bot protection

## Supabase Realtime Implementation Insights

### User Presence Tracking
Supabase Realtime allows tracking player presence in a game room:
```javascript
const room = supabaseClient.channel(roomName);

room
  .on(
    REALTIME_LISTEN_TYPES.PRESENCE,
    { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN },
    ({ newPresences }) => {
      setUsers((state) => {
        const newUsers = newPresences.map((presence) => ({
          name: presence.name,
        }));
        return [...state, ...newUsers];
      });
    }
  )
  .on(
    REALTIME_LISTEN_TYPES.PRESENCE,
    { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE },
    ({ leftPresences }) => {
      setUsers((state) =>
        state.filter((user) => !leftPresences.some((p) => p.name === user.name))
      );
    }
  )
  .on(
    REALTIME_LISTEN_TYPES.PRESENCE,
    { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC },
    () => {
      const state = room.presenceState<Presence>();
      setUsers(
        Object.values(state).map((presence) => ({
          name: presence?.[0]?.name,
        }))
      );
    }
  );
```

### Real-time Messaging
Supabase allows broadcasting messages to all clients in a room:
```javascript
// Sending a message
await room.send({
  type: "broadcast",
  event: "ready",
  payload: { username: currentUser },
});

// Listening for messages
room.on(
  REALTIME_LISTEN_TYPES.BROADCAST,
  { event: "ready" },
  ({ payload }) => {
    setUsers((state) =>
      state.map((user) => {
        if (user.name === payload.username) {
          return { ...user, ready: true };
        }
        return user;
      })
    );
  }
);
```

### Database Changes Listening
Supabase can listen to database changes in real-time:
```javascript
room.on(
  REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
  {
    event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE,
    schema: "public",
    table: "results",
    filter: `room_name=eq.${roomName}`,
  },
  (e) => {
    setUsers((state) =>
      state.map((user) =>
        user.name === e.new.name
          ? { ...user, score: e.new.result }
          : user
      )
    );
  }
);
```

## Implications for Sus Words Game

### Architecture Recommendations
1. **Backend Options**:
   - **Supabase**: Excellent for real-time features with built-in presence tracking and broadcasting
   - **Firebase**: Similar capabilities with Firestore and Realtime Database

2. **Game State Management**:
   - Use real-time database to sync game state across clients
   - Implement presence tracking for lobby management
   - Use broadcasting for game events (role assignments, clues, votes)

3. **Database Structure**:
   - `rooms` table: Track active game rooms
   - `players` table: Store player information and status
   - `game_rounds` table: Manage round information
   - `clues` table: Store clues given by players

### Implementation Challenges
1. **Real-time Synchronization**: Ensuring all clients see the same game state
2. **Security**: Implementing proper Row-Level Security (RLS) in Supabase
3. **State Management**: Handling complex state transitions between game phases
4. **Error Handling**: Gracefully managing disconnections and rejoins

### Next Steps for Sus Words
1. Choose between Supabase and Firebase based on familiarity and requirements
2. Design database schema for game state
3. Implement core real-time functionality:
   - Lobby creation and joining
   - Player presence tracking
   - Game state synchronization
   - Turn-based gameplay with real-time updates
