'use client'; // Needs client-side hooks and data fetching based on user

import { useEffect, useState, useRef } from 'react'; // Import useRef
import { useAuth } from '@/app/context/AuthContext'; // Use our custom hook
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js'; // Import types

// Define a type for the profile data we expect
interface ProfileData {
  username: string | null;
  full_name: string | null;
  // Add other profile fields if needed
}

export default function ProfilePage() {
  const { session, supabase, isLoading: isLoadingAuth } = useAuth(); // Get session, client, auth loading state
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false); // Start profile loading as false
  const [error, setError] = useState<string | null>(null);
  // Ref to track if we've attempted fetching profile for the current session/mount
  const fetchAttempted = useRef(false);

  // Effect 1: Handle redirection based on auth state
  useEffect(() => {
    // Only redirect when auth check is complete
    if (!isLoadingAuth) {
      if (!session) {
        // If no session after loading, redirect to login
        console.log("ProfilePage Effect 1: No session, redirecting to /auth");
        router.replace('/auth');
      } else {
        // If session exists, ensure fetch attempt flag is ready (could reset here if needed)
         console.log("ProfilePage Effect 1: Session found.");
      }
    } else {
       console.log("ProfilePage Effect 1: Auth is loading...");
    }
  }, [isLoadingAuth, session, router]);

  // Effect 2: Fetch profile data when authenticated and ready
  useEffect(() => {
    // Conditions to fetch:
    // 1. Auth must be loaded (isLoadingAuth is false)
    // 2. Session must exist
    // 3. Profile data must not already be loaded (!profile)
    // 4. Profile data must not currently be loading (!loadingProfile)
    // 5. Fetch must not have been attempted yet for this session/mount (!fetchAttempted.current)
    if (!isLoadingAuth && session && !profile && !loadingProfile && !fetchAttempted.current) {
      console.log("ProfilePage Effect 2: Conditions met, fetching profile for user:", session.user.id);
      setLoadingProfile(true); // Set loading TRUE before fetch
      setError(null);
      fetchAttempted.current = true; // Mark that we are attempting the fetch

      const fetchUserProfile = async () => {
        try {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            if (profileError.code === 'PGRST116') { // Specific error for no row found
               console.error('Profile not found (PGRST116). Trigger might be missing or failed?');
               setError('Profile data could not be found.');
               setProfile(null); // Ensure profile is null
            } else {
               throw profileError; // Throw other Supabase errors
            }
          } else {
            console.log("Profile fetched successfully:", data);
            setProfile(data); // Set profile data on success
            setError(null); // Clear any previous error
          }
        } catch (err: any) {
          console.error('Error fetching profile:', err);
          setError(err.message || 'An unknown error occurred while fetching profile.');
          setProfile(null); // Ensure profile is null on catch
        } finally {
          console.log("Setting loadingProfile to false");
          setLoadingProfile(false); // Set loading FALSE after fetch attempt (success or fail)
        }
      };

      fetchUserProfile();
    }

    // Reset fetch attempt flag if user logs out (session becomes null)
    if (!session) {
        fetchAttempted.current = false;
        // Optionally clear profile data immediately on logout detection here
        // if (profile) setProfile(null);
    }

  }, [isLoadingAuth, session, profile, loadingProfile, supabase]); // Dependencies controlling data fetch

  // --- Conditional Rendering Logic ---

  // 1. Show loading if Auth is loading OR (if auth is done & session exists BUT profile is loading)
  if (isLoadingAuth || (session && loadingProfile)) {
     console.log(`Rendering: Loading... (Auth: ${isLoadingAuth}, Profile: ${session && loadingProfile})`);
     // Distinguish between auth loading and profile loading for clarity
     return <div>{isLoadingAuth ? "Authenticating..." : "Loading Profile..."}</div>;
  }

  // 2. If Auth is done loading but there's no session (should be redirecting)
  // Render null or a minimal message while redirect happens.
  if (!session) {
     console.log("Rendering: No session (should be redirecting)...");
     return null; // Avoid showing anything while Effect 1 redirects
  }

  // 3. Auth is loaded, session exists, profile loading is done. Now check for errors or show data.
  console.log("Rendering: Profile Area (Error:", error, "Profile:", profile, ")");
  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {session.user.email}</p>
      <p>User ID: {session.user.id}</p>
      <h2>Profile Details</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!error && profile ? (
        <>
          <p>Username: {profile.username || 'Not set'}</p>
          <p>Full Name: {profile.full_name || 'Not set'}</p>
          {/* Add inputs for editing later */}
        </>
      ) : !error ? (
        // Handle case where fetch finished with no error but no data (should be caught by PGRST116, but fallback)
        <p>Profile data not available.</p>
      ) : null /* Don't show 'Not available' if there was an error */}

      <button
         onClick={async () => {
            setProfile(null); // Clear profile state
            fetchAttempted.current = false; // Reset fetch flag
            setError(null); // Clear errors
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) console.error('Error signing out:', signOutError);
            // AuthProvider context listener should handle redirect automatically
            // router.push('/auth'); // Can add fallback redirect if needed
         }}
         style={{ marginTop: '20px' }}
      >
        Sign Out
      </button>
    </div>
  );
}