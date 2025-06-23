import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

interface UseRealtimeSubscriptionConfig {
  onSubscribe?: (status: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseRealtimeSubscriptionReturn {
  channel: RealtimeChannel | null;
  isConnected: boolean;
  error: Error | null;
}

/**
 * React hook for managing Supabase realtime subscriptions.
 * Properly handles React component lifecycle and Strict Mode.
 */
export function useRealtimeSubscription(
  channelId: string,
  config: UseRealtimeSubscriptionConfig = {}
): UseRealtimeSubscriptionReturn {
  const { onSubscribe, onError, enabled = true } = config;
  
  // Use refs to persist values across re-renders
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribingRef = useRef(false);
  const supabaseRef = useRef(createClient());
  
  // Store callbacks in refs to avoid dependency issues
  const onSubscribeRef = useRef(onSubscribe);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onSubscribeRef.current = onSubscribe;
    onErrorRef.current = onError;
  }, [onSubscribe, onError]);
  
  // State for component updates
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Only create channel if enabled
    if (!enabled) {
      return;
    }
    
    // If already in the process of subscribing, don't start another
    if (isSubscribingRef.current) {
      console.log(`Channel ${channelId} subscription already in progress`);
      return;
    }
    
    console.log(`Creating new channel: ${channelId}`);
    
    // Create new channel
    const channel = supabaseRef.current.channel(channelId);
    channelRef.current = channel;
    isSubscribingRef.current = true;
    
    // Now subscribe to the channel
    channel.subscribe((status: string) => {
      console.log(`Channel ${channelId} status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to ${channelId}`);
        setIsConnected(true);
        setError(null);
        isSubscribingRef.current = false;
        onSubscribeRef.current?.(status);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to subscribe to ${channelId}`);
        setIsConnected(false);
        const subscriptionError = new Error(`Failed to subscribe to ${channelId}`);
        setError(subscriptionError);
        isSubscribingRef.current = false;
        onErrorRef.current?.(subscriptionError);
      } else if (status === 'CLOSED') {
        console.log(`Channel ${channelId} closed`);
        setIsConnected(false);
        isSubscribingRef.current = false;
      } else if (status === 'TIMED_OUT') {
        console.log(`Channel ${channelId} timed out`);
        setIsConnected(false);
        const timeoutError = new Error(`Channel ${channelId} timed out`);
        setError(timeoutError);
        isSubscribingRef.current = false;
      }
    });
    
    // Cleanup function - only runs on actual unmount or when enabled becomes false
    return () => {
      console.log(`Cleaning up channel: ${channelId}`);
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          console.warn(`Error unsubscribing from ${channelId}:`, error);
        }
        channelRef.current = null;
      }
      setIsConnected(false);
      setError(null);
      isSubscribingRef.current = false;
    };
  }, [channelId, enabled]); // Only depend on channelId and enabled
  
  return {
    channel: channelRef.current,
    isConnected,
    error
  };
}
