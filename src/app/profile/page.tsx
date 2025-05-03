'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns'; // Using date-fns for relative time

// --- Types ---

// Updated ProfileData: Removed location and email_notifications
interface ProfileData {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  architectural_preferences: string[] | null; // Kept for preferences tab
  // removed location
  // removed email_notifications
}

// Type for styles fetched from DB
interface Style {
    name: string;
}

// Types for Activity Data
interface SwipeStats {
  total: number;
  likes: number;
  dislikes: number;
}
interface TopStyle {
  name: string;
  likes: number;
}
interface RecentActivityItem {
  id: number; // swipe id
  direction: boolean;
  imageName: string;
  styleName: string;
  timestamp: string;
}

// --- Component ---

export default function ProfilePage() {
  const { session, supabase, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  // --- State Management ---
  const [profile, set_profile] = useState<ProfileData | null>(null);
  const [loading_profile, set_loading_profile] = useState(false);
  const [error, set_error] = useState<string | null>(null);
  const [is_editing, set_is_editing] = useState(false);
  const [form_data, set_form_data] = useState<ProfileData | null>(null);
  const [saving, set_saving] = useState(false);
  const [active_tab, set_active_tab] = useState<'profile' | 'preferences' | 'activity'>('profile');
  const [selected_styles, set_selected_styles] = useState<string[]>([]); // User's selected preferences
  const [available_styles, set_available_styles] = useState<string[]>([]); // Styles fetched from DB
  const [loading_styles, set_loading_styles] = useState(false);
  const [success_message, set_success_message] = useState<string | null>(null);

  // Activity State
  const [swipe_stats, set_swipe_stats] = useState<SwipeStats | null>(null);
  const [top_liked_styles, set_top_liked_styles] = useState<TopStyle[]>([]);
  const [recent_activities, set_recent_activities] = useState<RecentActivityItem[]>([]);
  const [loading_activity, set_loading_activity] = useState(false);

  // Ref to track if we've attempted fetching profile/styles
  const profile_fetch_attempted = useRef(false);
  const styles_fetch_attempted = useRef(false);
  const activity_fetch_attempted = useRef(false);

  // --- Effects ---

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !session) {
      router.replace('/auth');
    }
  }, [isLoadingAuth, session, router]);

  // Fetch profile data
  useEffect(() => {
    // Ensure supabase client is available and profile hasn't been fetched yet
    if (!isLoadingAuth && session && supabase && !profile && !loading_profile && !profile_fetch_attempted.current) {
      set_loading_profile(true);
      set_error(null);
      profile_fetch_attempted.current = true; // Mark attempt

      const fetch_user_profile = async () => {
        try {
          // Fetch only the necessary fields based on the updated ProfileData interface
          const { data, error: profile_error } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, bio, architectural_preferences') // Removed location, email_notifications
            .eq('id', session.user.id)
            .single();

          if (profile_error) {
            if (profile_error.code === 'PGRST116') { // No profile found, create one
              const new_profile_data: ProfileData & { id: string } = {
                id: session.user.id,
                username: null,
                full_name: null,
                avatar_url: null,
                bio: null,
                architectural_preferences: [], // Default to empty array
              };

              const { error: insert_error } = await supabase
                .from('profiles')
                .insert(new_profile_data); // Insert only defined fields

              if (insert_error) throw insert_error;

              // Exclude id when setting state
              const { id, ...new_profile_state } = new_profile_data;
              set_profile(new_profile_state);
              set_form_data(new_profile_state);
              set_selected_styles([]);
            } else {
              throw profile_error; // Rethrow other Supabase errors
            }
          } else {
            console.log("Profile fetched successfully:", data);
            set_profile(data);
            set_form_data(data);
            set_selected_styles(data.architectural_preferences || []); // Initialize selected styles
          }
        } catch (err: any) {
          console.error('Error fetching/creating profile:', err);
          set_error(`Failed to load profile: ${err.message || 'Unknown error'}`);
          set_profile(null); // Reset profile state on error
        } finally {
          set_loading_profile(false);
        }
      };

      fetch_user_profile();
    }

    // Reset fetch attempt flag if user logs out
    if (!session) {
      profile_fetch_attempted.current = false;
      styles_fetch_attempted.current = false; // Also reset styles fetch
      activity_fetch_attempted.current = false; // And activity fetch
      // Clear states on logout
      set_profile(null);
      set_form_data(null);
      set_selected_styles([]);
      set_available_styles([]);
      set_swipe_stats(null);
      set_top_liked_styles([]);
      set_recent_activities([]);
    }
  }, [isLoadingAuth, session, profile, loading_profile, supabase]); // Dependencies

  // Fetch available architectural styles
  useEffect(() => {
    if (supabase && !loading_styles && !styles_fetch_attempted.current && available_styles.length === 0) {
        set_loading_styles(true);
        styles_fetch_attempted.current = true;

        const fetch_styles = async () => {
            try {
                const { data, error: styles_error } = await supabase
                    .from('styles')
                    .select('name')
                    .order('name', { ascending: true });

                if (styles_error) throw styles_error;

                set_available_styles(data.map((style: Style) => style.name));
                console.log("Architectural styles fetched successfully.");
            } catch (err: any) {
                console.error('Error fetching styles:', err);
                set_error(prev => prev ? `${prev}\nFailed to load styles: ${err.message}` : `Failed to load styles: ${err.message}`);
            } finally {
                set_loading_styles(false);
            }
        };
        fetch_styles();
    }
  }, [supabase, loading_styles, available_styles]); // Dependencies

  // Fetch activity data when the activity tab is active and data isn't loaded
  useEffect(() => {
    if (active_tab === 'activity' && session && supabase && !loading_activity && !activity_fetch_attempted.current) {
        set_loading_activity(true);
        activity_fetch_attempted.current = true; // Mark as attempted for this session/tab view
        set_error(null); // Clear previous errors specific to activity

        const fetch_activity_data = async () => {
            const user_id = session.user.id;
            try {
                // --- 1. Fetch Swipe Stats ---
                const { count: total_count, error: total_error } = await supabase
                    .from('swipes')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user_id);
                if (total_error) throw new Error(`Stats(Total): ${total_error.message}`);

                const { count: likes_count, error: likes_error } = await supabase
                    .from('swipes')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user_id)
                    .eq('direction', true); // true = like/right swipe
                if (likes_error) throw new Error(`Stats(Likes): ${likes_error.message}`);

                const total = total_count ?? 0;
                const likes = likes_count ?? 0;
                set_swipe_stats({ total, likes, dislikes: total - likes });

                // --- 2. Fetch Top Liked Styles ---
                // This involves multiple steps: get liked image IDs, get styles for those images, aggregate.
                const { data: liked_swipes, error: liked_swipes_error } = await supabase
                    .from('swipes')
                    .select('image_id')
                    .eq('user_id', user_id)
                    .eq('direction', true);
                if (liked_swipes_error) throw new Error(`TopStyles(Swipes): ${liked_swipes_error.message}`);

                if (liked_swipes && liked_swipes.length > 0) {
                    const image_ids = liked_swipes.map(s => s.image_id);
                    // Fetch images and their related style names using foreign table join syntax
                    const { data: liked_images_with_styles, error: liked_images_error } = await supabase
                        .from('images')
                        .select('styles ( name )') // Select 'name' from the related 'styles' table
                        .in('id', image_ids);
                    if (liked_images_error) throw new Error(`TopStyles(Images/Styles): ${liked_images_error.message}`);

                    console.log("Raw liked_images_with_styles:", JSON.stringify(liked_images_with_styles, null, 2));

                    // Aggregate counts client-side
                    const style_counts: Record<string, number> = {};
                    liked_images_with_styles?.forEach(img => {
                        // Access the style name directly from the style object
                        const style_name = img.styles?.name; // <-- REMOVED [0]
                        if (style_name) {
                            style_counts[style_name] = (style_counts[style_name] || 0) + 1;
                        }
                    });

                    const sorted_top_styles = Object.entries(style_counts)
                        .map(([name, likes]) => ({ name, likes }))
                        .sort((a, b) => b.likes - a.likes)
                        .slice(0, 5); // Limit to top 5
                    set_top_liked_styles(sorted_top_styles);
                } else {
                    set_top_liked_styles([]); // No liked swipes found
                }

                // --- 3. Fetch Recent Activities ---
                const { data: recent_swipes_data, error: recent_swipes_error } = await supabase
                    .from('swipes')
                    .select(`
                        id,
                        direction,
                        created_at,
                        images (
                            storage_path,
                            styles ( name )
                        )
                    `) // Fetch related image and its style name
                    .eq('user_id', user_id)
                    .order('created_at', { ascending: false })
                    .limit(10); // Limit recent items
                if (recent_swipes_error) throw new Error(`RecentActivity: ${recent_swipes_error.message}`);

                console.log("Raw recent_swipes_data:", JSON.stringify(recent_swipes_data, null, 2));

                // Format data for display
                const formatted_recent_activities = recent_swipes_data?.map(swipe => {
                    // Access the image object directly
                    const image_data = swipe.images; // <-- REMOVED [0]
                
                    const full_path = image_data?.storage_path ?? ''; // This line was already okay
                    const file_name_with_ext = full_path.split('/').pop() ?? 'Unknown Image';
                    const file_name = file_name_with_ext.includes('.')
                        ? file_name_with_ext.substring(0, file_name_with_ext.lastIndexOf('.'))
                        : file_name_with_ext;
                
                    // Access the style name directly from the nested style object
                    const style_name = image_data?.styles?.name ?? 'Unknown Style'; // <-- REMOVED [0]
                
                    return {
                        id: swipe.id,
                        direction: swipe.direction,
                        imageName: file_name || 'Untitled Image',
                        styleName: style_name, // Use the correctly accessed style name
                        timestamp: swipe.created_at
                    };
                }) ?? [];
                set_recent_activities(formatted_recent_activities);

                console.log("Activity data fetched successfully.");

            } catch (err: any) {
                console.error('Error fetching activity data:', err);
                set_error(`Failed to load activity data: ${err.message}`);
                // Reset activity states on error
                set_swipe_stats(null);
                set_top_liked_styles([]);
                set_recent_activities([]);
            } finally {
                set_loading_activity(false);
            }
        };

        fetch_activity_data();
    }
    // Reset fetch attempt if tab changes away from activity
     if (active_tab !== 'activity') {
         activity_fetch_attempted.current = false;
     }

  }, [active_tab, session, supabase, loading_activity]); // Dependencies


  // --- Handlers ---

  // Handle form input changes (Text, Textarea)
  const handle_input_change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    set_form_data(prev => {
       const newState = prev ? { ...prev, [name]: value } : null;
       return newState;
    });
  };

  // Handle style preference toggles
  const toggle_style = (style: string) => {
    const updated_styles = selected_styles.includes(style)
        ? selected_styles.filter(s => s !== style)
        : [...selected_styles, style];

    set_selected_styles(updated_styles);

    // Update form_data immediately for saving
    set_form_data(prev => prev ? { ...prev, architectural_preferences: updated_styles } : null);
  };

  // Handle save profile (used by Profile and Preferences tabs)
  // Uses useCallback to prevent unnecessary re-renders if passed to child components later
  const handle_save_profile = useCallback(async (e?: React.FormEvent) => {
    console.log("--- handle_save_profile STARTED ---"); // <-- ADD THIS
    if (e) e.preventDefault();
    if (!session || !form_data) {
        console.log("handle_save_profile: No session or form_data, exiting."); // <-- ADD THIS
        return;
    }

    console.log("handle_save_profile: Preparing to save data:", form_data); // <-- ADD THIS
    console.log("handle_save_profile: Sending preferences:", selected_styles); // <-- ADD THIS

    set_saving(true);
    set_error(null);
    set_success_message(null);

    try {
      // Construct updates object with only the allowed fields
      const updates = {
        id: session.user.id, // Required for eq filter
        username: form_data.username,
        full_name: form_data.full_name,
        bio: form_data.bio,
        architectural_preferences: selected_styles, // Use the latest selected styles
        updated_at: new Date().toISOString(),
        // location and email_notifications are removed
      };

      const { error: update_error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (update_error) {
          // Check if error is due to missing column (useful for debugging)
          if (update_error.message.includes('column "architectural_preferences" does not exist')) {
               throw new Error("Database Error: The 'architectural_preferences' column seems to be missing in your 'profiles' table. Please add it (e.g., as type 'text[]').");
          }
          throw update_error;
      }


      // Update local profile state AFTER successful save
      // Create a new object matching ProfileData structure
       const updated_profile_state: ProfileData = {
         username: form_data.username,
         full_name: form_data.full_name,
         avatar_url: profile?.avatar_url || null, // Keep existing avatar
         bio: form_data.bio,
         architectural_preferences: selected_styles,
       };

      set_profile(updated_profile_state);
      set_form_data(updated_profile_state); // Sync form data with saved state

      set_success_message('Profile updated successfully!');
      setTimeout(() => set_success_message(null), 3000);

      set_is_editing(false); // Exit editing mode on successful save from profile tab
    } catch (err: any) {
      console.error('Error updating profile:', err);
      set_error(`Update failed: ${err.message || 'Unknown error'}`);
    } finally {
      set_saving(false);
    }
  }, [session, form_data, selected_styles, supabase, profile]); // Dependencies for useCallback


  // Handle avatar upload
  const handle_avatar_upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !session || !supabase) return;

    const file = e.target.files[0];
    const file_ext = file.name.split('.').pop();
    const file_name = `${session.user.id}-${Date.now()}.${file_ext}`; // Use timestamp for uniqueness
    const file_path = `${session.user.id}/${file_name}`; // Organize by user ID

    try {
        set_loading_profile(true); // Use profile loading state for avatar upload indicator
        set_error(null);
        set_success_message(null);

        // --- 1. Upload File ---
        const { error: upload_error } = await supabase.storage
            .from('avatars') // Ensure this bucket exists and has appropriate policies
            .upload(file_path, file);
        if (upload_error) throw new Error(`Upload failed: ${upload_error.message}`);

        // --- 2. Get Public URL ---
        const { data: url_data } = supabase.storage
            .from('avatars')
            .getPublicUrl(file_path);
        if (!url_data?.publicUrl) throw new Error("Could not get public URL for uploaded avatar.");
        const new_avatar_url = url_data.publicUrl;

        // --- 3. Update Profile Table ---
        const { error: update_error } = await supabase
            .from('profiles')
            .update({ avatar_url: new_avatar_url, updated_at: new Date().toISOString() })
            .eq('id', session.user.id);
        if (update_error) throw new Error(`Profile update failed: ${update_error.message}`);

// --- 4. Update Local State ---
        // Update profile state. If prev is null, return null. Otherwise, return
        // the previous profile object with the avatar_url updated.
        set_profile(prev => prev ? { ...prev, avatar_url: new_avatar_url } : null );

        // Do the same for form_data state
        set_form_data(prev => prev ? { ...prev, avatar_url: new_avatar_url } : null );

        set_success_message('Avatar updated successfully!');
        setTimeout(() => set_success_message(null), 3000);

    } catch (err: any) {
        console.error('Error uploading avatar:', err);
        set_error(`Avatar upload failed: ${err.message}`);
    } finally {
        set_loading_profile(false);
        // Clear the file input value so the same file can be selected again if needed
        e.target.value = '';
    }
  };

  // Handle sign out
  const handle_sign_out = async () => {
    set_error(null);
    if (supabase) {
        const { error: sign_out_error } = await supabase.auth.signOut();
        if (sign_out_error) console.error('Error signing out:', sign_out_error);
    }
    // State clearing is handled in the profile fetch useEffect when session becomes null
    router.push('/auth'); // Redirect to auth page after sign out
  };

  // --- Render Logic ---

  // Loading state (Authentication or initial Profile load)
  if (isLoadingAuth || (session && loading_profile && !profile)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center animate-pulse">
                {/* Placeholder Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">
              {isLoadingAuth ? "Authenticating..." : "Loading Profile..."}
            </div>
             {/* Basic spinner instead of pulse bar */}
             <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // If no session after loading, return null (redirect handled in useEffect)
  if (!session) return null;

  // --- Main Page Content ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-20">
      {/* Decorative elements */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
         <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-pink-200 opacity-20 blur-3xl"></div>
         <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-300 opacity-20 blur-3xl"></div>
         <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-pink-400 opacity-10 blur-3xl"></div>
         <div className="absolute top-24 right-12 text-pink-400 opacity-60 text-6xl">❤️</div>
         <div className="absolute top-40 left-16 text-pink-300 opacity-40 text-5xl">❤️</div>
         <div className="absolute bottom-48 right-32 text-pink-400 opacity-50 text-7xl">❤️</div>
       </div>

       {/* Header */}
       <header className="relative z-10 bg-white/80 backdrop-blur-sm shadow-sm">
         <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
           <Link href="/" className="text-2xl font-bold text-pink-700">ArchiSwipe</Link>
           <nav className="flex space-x-3 items-center">
             <Link href="/swipe" className="px-4 py-2 bg-pink-100 text-pink-700 border border-pink-200 rounded-full hover:bg-pink-200 font-medium shadow-sm transition duration-300">Swipe</Link>
             <button
               onClick={handle_sign_out}
               className="px-4 py-2 bg-pink-700 text-white rounded-full hover:bg-pink-800 font-semibold shadow-md transition duration-300"
             >Sign Out</button>
           </nav>
         </div>
       </header>

       {/* Main content area */}
       <section className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-xl overflow-hidden border border-pink-100"
        >
            {/* Profile Header/Banner */}
            <div className="h-48 bg-gradient-to-r from-pink-400 to-pink-700 relative">
                <div className="absolute -bottom-16 left-10">
                    <div className="relative group"> {/* Added group for hover effect on label */}
                        <div className="w-32 h-32 rounded-full border-4 border-white bg-pink-100 flex items-center justify-center overflow-hidden shadow-lg">
                             {/* Display loading state for avatar specifically */}
                            {loading_profile && is_editing ? (
                                 <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            )}
                        </div>
                        {/* Avatar Upload Button - visible only when editing */}
                        {is_editing && (
                            <label htmlFor="avatar-upload" className={`absolute bottom-0 right-0 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-pink-600 transition duration-200 border-2 border-white ${loading_profile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handle_avatar_upload}
                                    disabled={loading_profile} // Disable while uploading
                                />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Content Area */}
            <div className="pt-20 pb-10 px-10">
                {/* Global Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-wrap">{error}</div>
                )}

                 {/* Global Success Message */}
                {success_message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
                    >{success_message}</motion.div>
                )}

                {/* Tabs Navigation */}
                <div className="mb-8 border-b border-gray-200">
                   <div className="flex space-x-6">
                       <button onClick={() => set_active_tab('profile')} className={`pb-3 px-1 font-medium ${active_tab === 'profile' ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-500 hover:text-gray-800'} transition duration-200`}>Profile</button>
                       <button onClick={() => set_active_tab('preferences')} className={`pb-3 px-1 font-medium ${active_tab === 'preferences' ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-500 hover:text-gray-800'} transition duration-200`}>Architectural Preferences</button>
                       <button onClick={() => set_active_tab('activity')} className={`pb-3 px-1 font-medium ${active_tab === 'activity' ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-500 hover:text-gray-800'} transition duration-200`}>Activity</button>
                   </div>
                </div>

                {/* --- Tab Content --- */}

                {/* Profile Tab */}
                {active_tab === 'profile' && (
                  <form onSubmit={handle_save_profile}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Email (Read Only) */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input id="email" type="email" value={session.user.email || ''} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                        <p className="mt-1 text-xs text-gray-500">Your email cannot be changed here.</p>
                      </div>

                      {/* Username */}
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        {/* !! CONTRAST FIX APPLIED BELOW !! */}
                        <input id="username" name="username" type="text" value={form_data?.username || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                               className={`w-full px-4 py-2 border border-gray-200 rounded-lg ${
                                 is_editing
                                   ? 'bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500' // Added text-gray-900
                                   : 'bg-gray-100 text-gray-500 cursor-not-allowed' // Optional: Added text-gray-500
                               }`} />
                      </div>

                      {/* Full Name */}
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        {/* !! CONTRAST FIX APPLIED BELOW !! */}
                        <input id="full_name" name="full_name" type="text" value={form_data?.full_name || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                               className={`w-full px-4 py-2 border border-gray-200 rounded-lg ${
                                 is_editing
                                   ? 'bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500' // Added text-gray-900
                                   : 'bg-gray-100 text-gray-500 cursor-not-allowed' // Optional: Added text-gray-500
                               }`} />
                      </div>

                    </div> {/* End grid */}

                    {/* Bio */}
                    <div className="mb-8">
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                         {/* !! CONTRAST FIX APPLIED BELOW !! */}
                        <textarea id="bio" name="bio" rows={4} value={form_data?.bio || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                                  className={`w-full px-4 py-2 border border-gray-200 rounded-lg ${
                                    is_editing
                                      ? 'bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500' // Added text-gray-900
                                      : 'bg-gray-100 text-gray-500 cursor-not-allowed' // Optional: Added text-gray-500
                                  }`}
                                  placeholder={is_editing ? "Tell us about your architectural interests..." : ""}></textarea>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-start"> {/* Align buttons left */}
                       {!is_editing ? (
                         <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => set_is_editing(true)} className="px-6 py-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-semibold shadow-md transition duration-200">Edit Profile</motion.button>
                       ) : (
                         <div className="flex space-x-4">
                           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={saving} className={`px-6 py-3 bg-pink-600 text-white rounded-full font-semibold shadow-md transition duration-200 ${saving ? 'opacity-70 cursor-wait' : 'hover:bg-pink-700'}`}>
                             {saving ? 'Saving...' : 'Save Changes'}
                           </motion.button>
                           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => { set_is_editing(false); set_form_data(profile); set_error(null); /* Reset form data and errors */}} disabled={saving} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-semibold shadow-md transition duration-200">Cancel</motion.button>
                         </div>
                       )}
                     </div>
                   </form>
                )}

                {/* Preferences Tab */}
                {active_tab === 'preferences' && (
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Architectural Preferences</h2>
                        <p className="text-gray-600 mb-6">Select the architectural styles you love. This helps us match you with buildings you'll adore!</p>

                        {loading_styles && <p className="text-gray-500 italic">Loading styles...</p>}
                        {!loading_styles && available_styles.length === 0 && !error && <p className="text-gray-500">No architectural styles found.</p>}

                        {available_styles.length > 0 && (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                                    {/* Map over styles fetched from DB */}
                                    {available_styles.map((style) => (
                                        <div
                                            key={style}
                                            onClick={() => !saving && toggle_style(style)} // Prevent toggling while saving
                                            className={`relative p-4 rounded-lg border ${selected_styles.includes(style) ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-300'} ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} transition duration-200 shadow-sm`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`w-5 h-5 rounded-full border ${selected_styles.includes(style) ? 'border-pink-500 bg-pink-500' : 'border-gray-300'} flex items-center justify-center mr-2 flex-shrink-0`}>
                                                    {selected_styles.includes(style) && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                </div>
                                                {/* !! CONTRAST FIX APPLIED BELOW !! */}
                                                <span className="text-sm truncate text-gray-800">{style}</span> {/* Added text-gray-800 */}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end mt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => handle_save_profile()} // Use the same save handler
                                        disabled={saving || loading_styles}
                                        className={`px-6 py-3 bg-pink-600 text-white rounded-full font-semibold shadow-md transition duration-200 ${saving || loading_styles ? 'opacity-70 cursor-wait' : 'hover:bg-pink-700'}`}
                                    >
                                        {saving ? 'Saving...' : 'Save Preferences'}
                                    </motion.button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Activity Tab */}
                 {active_tab === 'activity' && (
                   <div>
                     <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your ArchiSwipe Activity</h2>

                     {/* Loading State for Activity */}
                     {loading_activity && (
                         <div className="text-center py-10">
                             <svg className="animate-spin h-8 w-8 text-pink-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             <p className="mt-2 text-gray-600">Loading your activity...</p>
                         </div>
                     )}

                     {/* Display Activity Data */}
                     {!loading_activity && !error && (
                       <>
                         {/* Stats Section */}
                         <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 mb-8">
                           <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                             {/* Buildings Viewed */}
                             <div className="w-full sm:w-1/3 bg-white rounded-lg shadow-sm p-4 text-center">
                               <div className="text-3xl font-bold text-pink-600 mb-1">{swipe_stats?.total ?? 0}</div>
                               <div className="text-sm text-gray-600">Buildings Viewed</div>
                             </div>
                             {/* Right Swipes */}
                             <div className="w-full sm:w-1/3 bg-white rounded-lg shadow-sm p-4 text-center">
                               <div className="text-3xl font-bold text-pink-600 mb-1">{swipe_stats?.likes ?? 0}</div>
                               <div className="text-sm text-gray-600">Right Swipes (Likes)</div>
                             </div>
                             {/* Left Swipes */}
                             <div className="w-full sm:w-1/3 bg-white rounded-lg shadow-sm p-4 text-center">
                               <div className="text-3xl font-bold text-pink-600 mb-1">{swipe_stats?.dislikes ?? 0}</div>
                               <div className="text-sm text-gray-600">Left Swipes (Passes)</div>
                             </div>
                           </div>

                           {/* Top Styles Section */}
                           <h3 className="font-semibold text-gray-700 mb-3">Your Top Styles (by Likes)</h3>
                           {top_liked_styles.length > 0 ? (
                               <div className="space-y-3">
                                   {top_liked_styles.map(style => (
                                       <div key={style.name} className="bg-white rounded-md p-3 flex justify-between items-center shadow-sm">
                                           <span className="font-medium text-gray-800">{style.name}</span>
                                           <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">{style.likes} {style.likes === 1 ? 'like' : 'likes'}</span>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                                <p className="text-gray-500 italic text-sm bg-white p-3 rounded-md shadow-sm">You haven't liked any styles yet!</p>
                           )}
                         </div>

                         {/* Recent Activity Section */}
                         <h3 className="font-semibold text-gray-700 mb-3">Recent Activity</h3>
                         {recent_activities.length > 0 ? (
                           <div className="space-y-3 mb-6">
                             {recent_activities.map(activity => (
                               <div key={activity.id} className="bg-white rounded-md p-4 border border-gray-200 shadow-sm flex items-center space-x-4">
                                 {/* Icon based on direction */}
                                 <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${activity.direction ? 'bg-pink-100' : 'bg-red-100'}`}>
                                   {activity.direction ? (
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                   ) : (
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                   )}
                                 </div>
                                 {/* Activity Description */}
                                 <div className="flex-grow">
                                     <div className="font-medium text-gray-800">
                                         You {activity.direction ? 'liked' : 'passed on'} a {activity.styleName} building called <span className="font-semibold italic">{activity.imageName}</span>
                                     </div>
                                     <div className="text-sm text-gray-500">
                                        {/* Format timestamp relative to now */}
                                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                    </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ) : (
                            <p className="text-gray-500 italic text-sm bg-white p-4 rounded-md shadow-sm border border-gray-200">No recent activity to show.</p>
                         )}

                         {/* Link to Swipe Page */}
                         <div className="flex justify-center mt-8">
                             <Link href="/swipe" className="inline-flex items-center px-6 py-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-semibold shadow-md transition duration-200">
                                 <span>Continue Swiping</span>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                             </Link>
                         </div>
                       </>
                     )}
                     {/* Show message if activity loaded but stats are null (might indicate initial state or an issue) */}
                     {!loading_activity && !error && !swipe_stats && recent_activities.length === 0 && top_liked_styles.length === 0 && (
                        <p className="text-gray-500 italic text-center py-6">Could not load activity details.</p>
                     )}
                   </div>
                 )}


            </div> {/* End profile content area */}
        </motion.div>
       </section>

       {/* Footer */}
       <footer className="relative z-10 mt-12 text-center text-gray-600 px-4">
         <p>© {new Date().getFullYear()} ArchiSwipe - Because buildings won't ghost you.</p> {/* Dynamic Year */}
       </footer>
    </main>
  );
}