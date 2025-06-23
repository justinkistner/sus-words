import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

// These will be replaced with environment variables in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anonymous Key is missing. Please check your environment variables.');
}

// Store active channels to prevent duplicate subscriptions
const activeChannels: Record<string, RealtimeChannel> = {};

// Singleton instance of Supabase client
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

// Create Supabase client
export const createClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anonymous Key is missing. Please check your environment variables.');
  }
  
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Create new instance and store it
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};

/**
 * Creates a realtime channel with improved error handling and subscription management.
 * This utility prevents duplicate subscriptions and provides retry logic.
 */
export const createRealtimeChannel = (
  channelId: string,
  config: {
    onSubscribe?: (status: string) => void;
    onError?: (error: Error) => void;
    maxRetries?: number;
  } = {}
): RealtimeChannel => {
  const { onSubscribe, onError, maxRetries = 3 } = config;
  const supabase = createClient();
  
  // Always clean up any existing channel with the same ID first
  if (activeChannels[channelId]) {
    console.log(`Cleaning up existing channel: ${channelId}`);
    const existingChannel = activeChannels[channelId];
    try {
      existingChannel.unsubscribe();
    } catch (e) {
      console.warn(`Error unsubscribing from existing channel ${channelId}:`, e);
    }
    delete activeChannels[channelId];
  }
  
  // Create a new channel
  console.log(`Creating new channel: ${channelId}`);
  const channel = supabase.channel(channelId);
  
  // Store the channel reference
  activeChannels[channelId] = channel;
  
  // Track subscription state to prevent multiple attempts
  let hasSubscribed = false;
  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  
  // Create a subscription function that can be retried
  const attemptSubscription = () => {
    // Prevent multiple subscription attempts on the same channel instance
    if (hasSubscribed) {
      console.log(`Channel ${channelId} already has a subscription attempt, skipping`);
      return;
    }
    
    hasSubscribed = true;
    
    try {
      channel.subscribe((status) => {
        console.log(`Channel ${channelId} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelId}`);
          retryCount = 0; // Reset retry count on success
          if (onSubscribe) onSubscribe(status);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${channelId}`);
          hasSubscribed = false; // Allow retry
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying subscription to ${channelId} (${retryCount}/${maxRetries})...`);
            
            // Clear any existing timeout
            if (retryTimeout) clearTimeout(retryTimeout);
            
            // Set a new timeout with exponential backoff
            retryTimeout = setTimeout(() => {
              attemptSubscription();
            }, 1000 * Math.pow(2, retryCount - 1)); // Exponential backoff: 1s, 2s, 4s, etc.
          } else {
            console.error(`Giving up on ${channelId} after ${maxRetries} attempts`);
            if (onError) {
              onError(new Error(`Failed to subscribe to ${channelId} after ${maxRetries} attempts`));
            }
            // Clean up failed channel
            delete activeChannels[channelId];
          }
        } else if (status === 'CLOSED') {
          console.log(`Channel ${channelId} closed`);
          hasSubscribed = false;
          delete activeChannels[channelId];
          if (retryTimeout) clearTimeout(retryTimeout);
        } else if (status === 'TIMED_OUT') {
          console.log(`Channel ${channelId} timed out`);
          hasSubscribed = false;
          delete activeChannels[channelId];
          if (retryTimeout) clearTimeout(retryTimeout);
        }
      });
    } catch (error: any) {
      console.error(`Error subscribing to channel ${channelId}:`, error);
      hasSubscribed = false;
      if (onError) onError(error as Error);
      delete activeChannels[channelId];
    }
  };
  
  // Start the subscription process
  attemptSubscription();
  
  // Override the unsubscribe method to clean up our tracking
  const originalUnsubscribe = channel.unsubscribe;
  channel.unsubscribe = function() {
    console.log(`Unsubscribing from channel: ${channelId}`);
    if (retryTimeout) clearTimeout(retryTimeout);
    delete activeChannels[channelId];
    return originalUnsubscribe.apply(this);
  };
  
  return channel;
};

// Clean up all channels on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    console.log('Cleaning up all active channels before page unload');
    Object.keys(activeChannels).forEach(channelId => {
      activeChannels[channelId].unsubscribe();
    });
  });
}

// Create a singleton instance for direct use
export const supabase = createClient();
