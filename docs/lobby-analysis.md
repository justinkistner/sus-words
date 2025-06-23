# Lobby Component Analysis

## Current Implementation (`/app/src/app/lobby/[id]/page.tsx`)

### Overview
The lobby component is responsible for displaying players waiting to start a game and handling real-time updates. It's experiencing critical issues with infinite loops and connection failures.

### Component Structure

#### State Management
```typescript
const [room, setRoom] = useState<GameRoom | null>(null);
const [players, setPlayers] = useState<Player[]>([]);
const [isHost, setIsHost] = useState(false);
const [isReady, setIsReady] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isStartingGame, setIsStartingGame] = useState(false);
const [copied, setCopied] = useState(false);

const supabase = createClient();
```

**CRITICAL ISSUE #1**: `const supabase = createClient();` is called on every render.

### useEffect Hook Analysis

#### Dependencies
```typescript
useEffect(() => {
  // ... component logic
}, [roomId, router]);
```

**Analysis**: Dependencies look correct - `roomId` and `router` should be stable.

#### Effect Logic Flow
1. **Validation**: Check for `playerId` in localStorage
2. **Data Fetching**: `fetchRoomData()` function
3. **Channel Creation**: `createRealtimeChannel()`
4. **Event Subscriptions**: Two postgres_changes listeners
5. **Initial Fetch**: Call `fetchRoomData()`
6. **Cleanup**: Unsubscribe from channel

### Critical Issues Identified

#### Issue 1: Supabase Client Recreation
```typescript
const supabase = createClient(); // Called on every render
```

**Problem**: Even though `createClient()` uses a singleton pattern, this line executes on every render, potentially causing issues with React's dependency tracking.

**Impact**: Could trigger unnecessary re-renders or effect re-runs.

#### Issue 2: fetchRoomData Closure Issue
```typescript
const fetchRoomData = async () => {
  // Uses 'supabase' from component scope
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  // ...
};
```

**Problem**: `fetchRoomData` captures the `supabase` instance in its closure. If `supabase` reference changes between renders, this could cause issues.

#### Issue 3: Recursive Data Fetching
```typescript
lobbyChannel.on('postgres_changes', 
  { 
    event: '*', 
    schema: 'public', 
    table: 'room_players',
    filter: `room_id=eq.${roomId}`
  }, 
  () => {
    console.log('Room players update received in lobby');
    fetchRoomData(); // This could trigger more updates
  }
);
```

**CRITICAL PROBLEM**: This creates a potential infinite loop:
1. Component mounts → fetchRoomData() → updates state
2. State update triggers re-render
3. Re-render might trigger useEffect again
4. New channel subscription → fetchRoomData() → more state updates
5. Loop continues

#### Issue 4: Channel Lifecycle Mismatch
```typescript
// Create channel
const lobbyChannel = createRealtimeChannel(`lobby:${roomId}`, {
  // ... config
});

// Add listeners
lobbyChannel.on('postgres_changes', ...);

// Initial fetch AFTER channel setup
fetchRoomData();

return () => {
  lobbyChannel.unsubscribe();
};
```

**Problem**: The channel is created and configured inside the useEffect, but `createRealtimeChannel` immediately starts the subscription process. This timing could cause race conditions.

### React Strict Mode Impact

In React Strict Mode (development):
1. **First Mount**: 
   - useEffect runs → creates channel → starts subscription
   - fetchRoomData() called → state updates
2. **Strict Mode Unmount**: 
   - Cleanup runs → lobbyChannel.unsubscribe()
3. **Second Mount**: 
   - useEffect runs again → createRealtimeChannel destroys previous channel
   - Creates new channel → starts new subscription
   - Previous channel might still be subscribing → "multiple subscription" error

### Error Patterns Observed

#### "Error fetching lobby data: {}"
- Suggests the initial data fetch is failing
- Empty error object indicates the error might be caught and transformed incorrectly
- Could be related to RLS policies or network issues

#### "tried to subscribe multiple times"
- Confirms the React Strict Mode issue
- Channel instances are being reused incorrectly
- Subscription state is not properly tracked

#### Infinite Recursion
- Likely caused by the fetchRoomData() call in the postgres_changes handler
- Each data fetch might trigger state updates that cause re-renders
- Re-renders might trigger new subscriptions

### Root Cause Analysis

The primary issue is **architectural**: the current approach doesn't properly handle React's component lifecycle, especially in development mode with Strict Mode enabled.

**Key Problems**:
1. Channel management is not React-aware
2. Data fetching is triggered by real-time events, creating feedback loops
3. Component re-renders destroy and recreate channels unnecessarily
4. Subscription state is not properly managed across re-renders

### Proposed Solutions

#### Solution 1: Custom React Hook
Create a `useRealtimeSubscription` hook that:
- Uses `useRef` to persist channel instances
- Properly handles React lifecycle
- Manages subscription state correctly

#### Solution 2: Separate Data Fetching from Real-time Updates
- Fetch initial data once on mount
- Use real-time updates to incrementally update state
- Avoid full data refetches on every change

#### Solution 3: Channel Factory with React Integration
- Create channels outside of component lifecycle
- Use React context to share channels across components
- Implement proper cleanup on component unmount only

### Recommended Approach

**Combination of Solutions 1 and 2**:
1. Create a custom hook for real-time subscriptions
2. Separate initial data loading from real-time updates
3. Use incremental state updates instead of full refetches
4. Test thoroughly with React Strict Mode enabled

### Next Steps

1. Analyze the game component to see if it has similar issues
2. Review RLS policies to ensure they're not causing data fetch failures
3. Implement the recommended solution
4. Test with both development and production builds

---

*Analysis completed: 2025-06-21*
