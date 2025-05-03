'use client'; // This component needs to run on the client

import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/app/lib/supabaseClient'; // Adjust path if needed
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          // Redirect user to the home page (or swipe page later) after sign in
          console.log('User signed in, redirecting...');
          // Use replace to avoid adding the auth page to browser history
          router.replace('/');
        }
        // Optional: Handle SIGNED_OUT event if needed
        // if (event === 'SIGNED_OUT') {
        //   router.push('/auth'); // Or wherever you want logged out users to go
        // }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Optional: Check if user is already logged in and redirect immediately
  // This might cause a flicker, could be handled better with a global context later
  // useEffect(() => {
  //   async function checkSession() {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (session) {
  //       router.replace('/');
  //     }
  //   }
  //   checkSession();
  // }, [router]);


  return (
    <div style={{ maxWidth: '420px', margin: '96px auto' }}>
      {/* Supabase Auth UI Component */}
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }} // Basic Supabase theme
        providers={['google', 'github']} // Optional: Add social providers
        theme="dark" // Optional: "light" or "dark"
        redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`} // Important for social logins if you add them
      />
    </div>
  );
}