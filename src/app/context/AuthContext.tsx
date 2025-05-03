'use client'; // Context Provider will be a client component

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { SupabaseClient, Session } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient'; // Adjust path if needed

// Define the shape of the context data
interface AuthContextType {
  supabase: SupabaseClient;
  session: Session | null;
  isLoading: boolean; // Add loading state
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  // IMPORTANT: Start isLoading as true. We are not authenticated until the listener confirms.
  const [isLoading, setIsLoading] = useState(true);

  // Log whenever the provider itself renders or re-renders
  console.log(`%cAuthProvider Rendering: isLoading=${isLoading}, session=`, 'color: blue', session);

  useEffect(() => {
    // This effect should run only once when the component mounts
    console.log('%cAuthProvider useEffect: Mounting listener...', 'color: green');
    setIsLoading(true); // Ensure we are in loading state when listener starts

    // --- Strategy Change: Rely *only* on the auth state change listener ---
    // The listener will give us the initial state when it connects AND updates on change.
    // Let's remove the explicit getSession() call inside the context for now.

    console.log('%cAuthProvider useEffect: Subscribing to onAuthStateChange...', 'color: green');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Log EVERY event from the listener
        console.log(`%cAuthProvider Listener Received: Event = ${event}, Session =`, 'color: orange', currentSession);

        // Update session state based *only* on the listener's value
        setSession(currentSession);
        // Crucially, set loading to false *only after* the listener provides an update
        // This means we know the definitive auth status (either null or a session object)
        setIsLoading(false);
        console.log(`%cAuthProvider Listener Updated State: isLoading=false, session=`, 'color: orange', currentSession);
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log('%cAuthProvider useEffect: Unsubscribing listener.', 'color: red');
      authListener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this effect runs only ONCE on mount

  const value = {
    supabase,
    session,
    isLoading,
  };

  // Provide the context value to children
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for easy context consumption (no changes needed here)
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}