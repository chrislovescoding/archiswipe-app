// src/app/context/AuthContext.tsx
'use client'; // Context Provider will be a client component

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { SupabaseClient, Session } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient'; // This is your actual client instance

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
  const [isLoading, setIsLoading] = useState(true);

  console.log(`%cAuthProvider Rendering: isLoading=${isLoading}, session=`, 'color: blue', session);

  // useEffect for auth state changes
  useEffect(() => {
    console.log('%cAuthProvider useEffect: Mounting auth listener...', 'color: green');
    setIsLoading(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log(`%cAuthProvider Listener Received: Event = ${event}, Session =`, 'color: orange', currentSession);
        setSession(currentSession);
        setIsLoading(false);
        console.log(`%cAuthProvider Listener Updated State: isLoading=false, session=`, 'color: orange', currentSession);
      }
    );

    return () => {
      console.log('%cAuthProvider useEffect: Unsubscribing auth listener.', 'color: red');
      authListener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this effect runs only ONCE on mount

  // useEffect for attaching supabase client to window for debugging (runs only once on client)
  useEffect(() => {
    // FOR DEBUGGING PURPOSES ONLY - REMOVE FOR PRODUCTION
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // 'supabase' here refers to the imported instance at the top of this file
      (window as any).supabaseDebug = supabase;
      console.log("Supabase client instance attached to window.supabaseDebug for debugging.");
    }
  }, []); // Empty dependency array ensures this runs once on mount

  const value = {
    supabase, // This is the imported instance from '@/app/lib/supabaseClient'
    session,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for easy context consumption
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}