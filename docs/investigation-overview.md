# Sus Words Connection Issues Investigation

## Problem Statement

The multiplayer Sus Words game has been experiencing persistent Supabase realtime connection issues that prevent basic functionality like:
- Players joining lobbies
- Real-time updates in lobbies
- Starting games
- Basic multiplayer synchronization

## Symptoms Observed

1. **"Failed to subscribe to lobby:xxx after 3 attempts"** - Repeated subscription failures
2. **"tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance"** - Multiple subscription attempts on same channel
3. **"Error fetching lobby data: {}"** - Initial data fetch failures
4. **Infinite recursion loops** - useEffect hooks running repeatedly
5. **High connection count** - Previously exceeded Supabase's 200 connection limit (500/200)

## Previous Attempts (Failed)

1. **Consolidated subscriptions** - Combined multiple subscriptions into single channels
2. **Created `createRealtimeChannel` utility** - Added retry logic and error handling
3. **Fixed RLS policies** - Updated to allow anonymous access
4. **Singleton Supabase client** - Prevented multiple client instances
5. **Channel cleanup improvements** - Added better unsubscribe logic
6. **TypeScript fixes** - Fixed type mismatches

## Current Status

Despite multiple attempts, the core issues persist. The application cannot reliably:
- Establish realtime connections
- Maintain stable subscriptions
- Handle component re-renders without breaking connections

## Investigation Plan

This document outlines a systematic investigation to:
1. Understand the exact flow of connection establishment
2. Identify root causes of subscription failures
3. Document the current state of all relevant components
4. Propose a comprehensive solution based on findings

## Files to Investigate

1. `/app/src/lib/supabase.ts` - Connection utility and client management
2. `/app/src/app/lobby/[id]/page.tsx` - Lobby component with connection issues
3. `/app/src/app/game/[id]/page.tsx` - Game component (for comparison)
4. Database RLS policies - Current anonymous access setup
5. Supabase dashboard - Connection metrics and logs

## Next Steps

1. Deep dive into each component
2. Document current behavior and identify issues
3. Propose specific fixes based on findings
4. Test fixes systematically

---

*Investigation started: 2025-06-21*
