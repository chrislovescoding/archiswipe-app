// src/app/profile/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Users as UsersIcon, Compass as CompassIcon } from 'lucide-react'; // For nav consistency

// --- Types ---
interface ProfileData {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  architectural_preferences: string[] | null;
}
interface Style { name: string; }
interface SwipeStats { total: number; likes: number; dislikes: number; }
interface TopStyle { name: string; likes: number; }
interface RecentActivityItem { id: number; direction: boolean; imageName: string; styleName: string; timestamp: string; }

// Define more specific types for Supabase responses to help TypeScript
interface SupabaseImageWithSingleStyle {
  styles: { name: string | null } | null | { name: string | null }[]; // Can be object, null, or array of objects
}

interface SupabaseSwipeWithImageData {
  id: number;
  direction: boolean;
  created_at: string;
  images: { // Can be object, null, or array of objects
    storage_path: string | null;
    styles: { name: string | null } | null | { name: string | null }[];
  } | null | {
    storage_path: string | null;
    styles: { name: string | null } | null | { name: string | null }[];
  }[];
}


// --- Simple Heart component for background decoration (copied from page.tsx) ---
const Heart = ({ className = '' }: { className?: string }) => (
  <div className={`absolute text-[rgb(var(--primary-rgb))] ${className}`}>❤️</div>
);

export default function ProfilePage() {
  const { session, supabase, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const [profile, set_profile] = useState<ProfileData | null>(null);
  const [loading_profile, set_loading_profile] = useState(false);
  const [error, set_error] = useState<string | null>(null);
  const [is_editing, set_is_editing] = useState(false);
  const [form_data, set_form_data] = useState<ProfileData | null>(null);
  const [saving, set_saving] = useState(false);
  const [active_tab, set_active_tab] = useState<'profile' | 'preferences' | 'activity'>('profile');
  const [selected_styles, set_selected_styles] = useState<string[]>([]);
  const [available_styles, set_available_styles] = useState<string[]>([]);
  const [loading_styles, set_loading_styles] = useState(false);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [swipe_stats, set_swipe_stats] = useState<SwipeStats | null>(null);
  const [top_liked_styles, set_top_liked_styles] = useState<TopStyle[]>([]);
  const [recent_activities, set_recent_activities] = useState<RecentActivityItem[]>([]);
  const [loading_activity, set_loading_activity] = useState(false);

  const profile_fetch_attempted = useRef(false);
  const styles_fetch_attempted = useRef(false);
  const activity_fetch_attempted = useRef(false);

  // --- Nav Link Styles (copied from page.tsx for consistency) ---
  const navLinkBase = "px-4 py-2 rounded-full font-medium smooth-transition text-sm shadow-sm hover:shadow-md";
  // For "Swipe" and other secondary links if needed
  const navLinkSecondary = `${navLinkBase} bg-white text-[rgb(var(--primary-text-soft-rgb))] border border-[rgba(var(--primary-light-rgb),0.5)] hover:bg-[rgba(var(--primary-light-rgb),0.2)]`;
  // For primary action like "Sign Out" (though it has its own style below for now)
  const navLinkPrimary = `${navLinkBase} bg-[rgb(var(--primary-rgb))] text-white hover:bg-[rgb(var(--primary-hover-rgb))]`;


  useEffect(() => {
    if (!isLoadingAuth && !session) {
      router.replace('/auth');
    }
  }, [isLoadingAuth, session, router]);

  useEffect(() => {
    if (!isLoadingAuth && session && supabase && !profile && !loading_profile && !profile_fetch_attempted.current) {
      set_loading_profile(true);
      set_error(null);
      profile_fetch_attempted.current = true;
      const fetch_user_profile = async () => {
        try {
          const { data, error: profile_error } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, bio, architectural_preferences')
            .eq('id', session.user.id)
            .single();
          if (profile_error) {
            if (profile_error.code === 'PGRST116') {
              const new_profile_data: ProfileData & { id: string } = {
                id: session.user.id, username: null, full_name: null, avatar_url: null, bio: null, architectural_preferences: [],
              };
              const { error: insert_error } = await supabase.from('profiles').insert(new_profile_data);
              if (insert_error) throw insert_error;
              const { id, ...new_profile_state } = new_profile_data;
              set_profile(new_profile_state); set_form_data(new_profile_state); set_selected_styles([]);
            } else { throw profile_error; }
          } else if (data) { // Ensure data is not null
            set_profile(data); set_form_data(data); set_selected_styles(data.architectural_preferences || []);
          }
        } catch (err: any) {
          set_error(`Failed to load profile: ${err.message || 'Unknown error'}`); set_profile(null);
        } finally { set_loading_profile(false); }
      };
      fetch_user_profile();
    }
    if (!session) {
      profile_fetch_attempted.current = false; styles_fetch_attempted.current = false; activity_fetch_attempted.current = false;
      set_profile(null); set_form_data(null); set_selected_styles([]); set_available_styles([]);
      set_swipe_stats(null); set_top_liked_styles([]); set_recent_activities([]);
    }
  }, [isLoadingAuth, session, profile, loading_profile, supabase]);

  useEffect(() => {
    if (supabase && !loading_styles && !styles_fetch_attempted.current && available_styles.length === 0) {
        set_loading_styles(true); styles_fetch_attempted.current = true;
        const fetch_styles = async () => {
            try {
                const { data, error: styles_error } = await supabase.from('styles').select('name').order('name', { ascending: true });
                if (styles_error) throw styles_error;
                if (data) {
                    set_available_styles(data.map((style: Style) => style.name));
                }
            } catch (err: any) {
                set_error(prev => prev ? `${prev}\nFailed to load styles: ${err.message}` : `Failed to load styles: ${err.message}`);
            } finally { set_loading_styles(false); }
        };
        fetch_styles();
    }
  }, [supabase, loading_styles, available_styles]);

  useEffect(() => {
    if (active_tab === 'activity' && session && supabase && !loading_activity && !activity_fetch_attempted.current) {
        set_loading_activity(true); activity_fetch_attempted.current = true; set_error(null);
        const fetch_activity_data = async () => {
            const user_id = session.user.id;
            try {
                const { count: total_count, error: total_error } = await supabase.from('swipes').select('*', { count: 'exact', head: true }).eq('user_id', user_id);
                if (total_error) throw new Error(`Stats(Total): ${total_error.message}`);
                const { count: likes_count, error: likes_error } = await supabase.from('swipes').select('*', { count: 'exact', head: true }).eq('user_id', user_id).eq('direction', true);
                if (likes_error) throw new Error(`Stats(Likes): ${likes_error.message}`);
                const total = total_count ?? 0; const likes = likes_count ?? 0;
                set_swipe_stats({ total, likes, dislikes: total - likes });

                const { data: liked_swipes, error: liked_swipes_error } = await supabase.from('swipes').select('image_id').eq('user_id', user_id).eq('direction', true);
                if (liked_swipes_error) throw new Error(`TopStyles(Swipes): ${liked_swipes_error.message}`);

                if (liked_swipes && liked_swipes.length > 0) {
                    const image_ids = liked_swipes.map(s => s.image_id);
                    // Explicitly type the expected response for liked_images_with_styles
                    const { data: liked_images_with_styles, error: liked_images_error } =
                        await supabase.from('images')
                                    .select('styles ( name )')
                                    .in('id', image_ids) as { data: SupabaseImageWithSingleStyle[] | null; error: any };

                    if (liked_images_error) throw new Error(`TopStyles(Images/Styles): ${liked_images_error.message}`);
                    const style_counts: Record<string, number> = {};

                    liked_images_with_styles?.forEach(img_container => { // img_container is SupabaseImageWithSingleStyle
                        let style_name: string | undefined | null = undefined;
                        if (img_container.styles) {
                            if (Array.isArray(img_container.styles) && img_container.styles.length > 0) {
                                style_name = img_container.styles[0]?.name;
                            } else if (!Array.isArray(img_container.styles)) { // It's a single object
                                style_name = (img_container.styles as { name: string | null })?.name;
                            }
                        }
                        if (style_name) { style_counts[style_name] = (style_counts[style_name] || 0) + 1; }
                    });
                    const sorted_top_styles = Object.entries(style_counts).map(([name, likes_val]) => ({ name, likes: likes_val })).sort((a, b) => b.likes - a.likes).slice(0, 5);
                    set_top_liked_styles(sorted_top_styles);
                } else { set_top_liked_styles([]); }

                // Explicitly type the expected response for recent_swipes_data
                const { data: recent_swipes_data, error: recent_swipes_error } =
                    await supabase.from('swipes')
                                .select(`id, direction, created_at, images ( storage_path, styles ( name ) )`)
                                .eq('user_id', user_id)
                                .order('created_at', { ascending: false })
                                .limit(10) as { data: SupabaseSwipeWithImageData[] | null; error: any };

                if (recent_swipes_error) throw new Error(`RecentActivity: ${recent_swipes_error.message}`);

                const formatted_recent_activities = recent_swipes_data?.map(swipe => {
                    let actual_image_data: { storage_path: string | null; styles: { name: string | null } | null | { name: string | null }[] } | null = null;
                    if (swipe.images) {
                        if (Array.isArray(swipe.images) && swipe.images.length > 0) {
                            actual_image_data = swipe.images[0];
                        } else if (!Array.isArray(swipe.images)) {
                            actual_image_data = swipe.images as { storage_path: string | null; styles: { name: string | null } | null | { name: string | null }[] };
                        }
                    }

                    const full_path = actual_image_data?.storage_path ?? '';
                    const file_name_with_ext = full_path.split('/').pop() ?? 'Unknown Image';
                    const file_name = file_name_with_ext.includes('.') ? file_name_with_ext.substring(0, file_name_with_ext.lastIndexOf('.')) : file_name_with_ext;
                    
                    let style_name_for_activity: string | undefined | null = 'Unknown Style';
                    if (actual_image_data?.styles) {
                        if (Array.isArray(actual_image_data.styles) && actual_image_data.styles.length > 0) {
                            style_name_for_activity = actual_image_data.styles[0]?.name;
                        } else if (!Array.isArray(actual_image_data.styles)) {
                            style_name_for_activity = (actual_image_data.styles as { name: string | null })?.name;
                        }
                    }

                    return { id: swipe.id, direction: swipe.direction, imageName: file_name || 'Untitled Image', styleName: style_name_for_activity ?? 'Unknown Style', timestamp: swipe.created_at };
                }) ?? [];
                set_recent_activities(formatted_recent_activities);

            } catch (err: any) {
                set_error(`Failed to load activity data: ${err.message}`);
                set_swipe_stats(null); set_top_liked_styles([]); set_recent_activities([]);
            } finally { set_loading_activity(false); }
        };
        fetch_activity_data();
    }
     if (active_tab !== 'activity') { activity_fetch_attempted.current = false; }
  }, [active_tab, session, supabase, loading_activity]);


  const handle_input_change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    set_form_data(prev => prev ? { ...prev, [name]: value } : null);
  };

  const toggle_style = (style: string) => {
    const updated_styles = selected_styles.includes(style) ? selected_styles.filter(s => s !== style) : [...selected_styles, style];
    set_selected_styles(updated_styles);
    set_form_data(prev => prev ? { ...prev, architectural_preferences: updated_styles } : null);
  };

  const handle_save_profile = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!session || !form_data) return;
    set_saving(true); set_error(null); set_success_message(null);
    try {
      const updates = {
        id: session.user.id, username: form_data.username, full_name: form_data.full_name,
        bio: form_data.bio, architectural_preferences: selected_styles, updated_at: new Date().toISOString(),
      };
      const { error: update_error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
      if (update_error) {
          if (update_error.message.includes('column "architectural_preferences" does not exist')) {
               throw new Error("Database Error: The 'architectural_preferences' column seems to be missing in your 'profiles' table. Please add it (e.g., as type 'text[]').");
          }
          throw update_error;
      }
       const updated_profile_state: ProfileData = {
         username: form_data.username, full_name: form_data.full_name,
         avatar_url: profile?.avatar_url || null, bio: form_data.bio,
         architectural_preferences: selected_styles,
       };
      set_profile(updated_profile_state); set_form_data(updated_profile_state);
      set_success_message('Profile updated successfully!'); setTimeout(() => set_success_message(null), 3000);
      set_is_editing(false);
    } catch (err: any) {
      set_error(`Update failed: ${err.message || 'Unknown error'}`);
    } finally { set_saving(false); }
  }, [session, form_data, selected_styles, supabase, profile]);


  const handle_avatar_upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !session || !supabase) return;
    const file = e.target.files[0]; const file_ext = file.name.split('.').pop();
    const file_name = `${session.user.id}-${Date.now()}.${file_ext}`; const file_path = `${session.user.id}/${file_name}`;
    try {
        set_loading_profile(true); set_error(null); set_success_message(null);
        const { error: upload_error } = await supabase.storage.from('avatars').upload(file_path, file);
        if (upload_error) throw new Error(`Upload failed: ${upload_error.message}`);
        const { data: url_data } = supabase.storage.from('avatars').getPublicUrl(file_path);
        if (!url_data?.publicUrl) throw new Error("Could not get public URL for uploaded avatar.");
        const new_avatar_url = url_data.publicUrl;
        const { error: update_error } = await supabase.from('profiles').update({ avatar_url: new_avatar_url, updated_at: new Date().toISOString() }).eq('id', session.user.id);
        if (update_error) throw new Error(`Profile update failed: ${update_error.message}`);
        set_profile(prev => prev ? { ...prev, avatar_url: new_avatar_url } : null );
        set_form_data(prev => prev ? { ...prev, avatar_url: new_avatar_url } : null );
        set_success_message('Avatar updated successfully!'); setTimeout(() => set_success_message(null), 3000);
    } catch (err: any) {
        set_error(`Avatar upload failed: ${err.message}`);
    } finally { set_loading_profile(false); e.target.value = ''; }
  };

  const handle_sign_out = async () => {
    set_error(null);
    if (supabase) {
        const { error: sign_out_error } = await supabase.auth.signOut();
        if (sign_out_error) console.error('Error signing out:', sign_out_error);
    }
    router.push('/auth');
  };


  if (isLoadingAuth || (session && loading_profile && !profile)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">
              {isLoadingAuth ? "Authenticating..." : "Loading Profile..."}
            </div>
             <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // --- MODIFIED: Replaced main tag class and added decorative elements ---
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 text-slate-700">
      {/* Decorative elements from page.tsx */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-80">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-pink-200/30 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-rose-300/30 blur-3xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-fuchsia-400/20 blur-3xl animate-pulse-slow animation-delay-4000"></div>
        <Heart className="top-16 left-1/4 text-6xl opacity-20 -rotate-12 animate-pulse-slow animation-delay-2000" />
        <Heart className="top-1/3 right-12 text-8xl opacity-15 rotate-[25deg] animate-pulse-slow" />
        <Heart className="top-3/4 left-10 text-5xl opacity-25 rotate-6 animate-pulse-slow animation-delay-4000" />
        <Heart className="bottom-10 right-1/3 text-7xl opacity-20 -rotate-[15deg] animate-pulse-slow" />
        <Heart className="bottom-1/2 left-1/2 text-4xl opacity-30 rotate-[5deg] animate-pulse-slow animation-delay-2000" />
        <Heart className="bottom-1/4 right-16 text-6xl opacity-10 rotate-[30deg] animate-pulse-slow" />
        <Heart className="top-10 right-10 text-5xl opacity-20 rotate-[10deg] animate-pulse-slow animation-delay-4000" />
        <Heart className="left-5 top-2/3 text-7xl opacity-15 -rotate-[20deg] animate-pulse-slow" />
      </div>

       {/* MODIFIED Header to match page.tsx style */}
       <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
         <div className="container mx-auto px-4 sm:px-6 lg:px-8"> {/* Using container from page.tsx */}
           <div className="flex justify-between items-center py-4">
             <Link href="/" className="text-3xl font-bold text-[rgb(var(--primary-rgb))]">ArchiSwipe</Link> {/* Logo style from page.tsx */}
             <nav className="flex space-x-3 items-center">
               <Link href="/swipe" className={navLinkSecondary}> {/* Use navLinkSecondary for "Swipe" */}
                  <CompassIcon size={18} className="inline mr-1" /> Swipe
               </Link>
               <button
                 onClick={handle_sign_out}
                 // Using navLinkPrimary for Sign Out to make it look like a primary action button
                 className={navLinkPrimary}
               >Sign Out</button>
             </nav>
           </div>
         </div>
       </header>

       {/* Main content area - structure largely the same, z-index adjusted */}
       <section className="relative z-10 max-w-6xl mx-auto px-4 py-8"> {/* Kept max-w-6xl for profile content */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            // Keeping bg-white for the profile card itself for good contrast
            className="bg-white rounded-3xl shadow-xl overflow-hidden border border-pink-100"
        >
            {/* Profile Header/Banner */}
            <div className="h-48 bg-gradient-to-r from-pink-400 to-pink-700 relative">
                <div className="absolute -bottom-16 left-10">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-white bg-pink-100 flex items-center justify-center overflow-hidden shadow-lg">
                            {loading_profile && is_editing ? (
                                 <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            )}
                        </div>
                        {is_editing && (
                            <label htmlFor="avatar-upload" className={`absolute bottom-0 right-0 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-pink-600 transition duration-200 border-2 border-white ${loading_profile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handle_avatar_upload} disabled={loading_profile} />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Content Area */}
            <div className="pt-20 pb-10 px-10">
                {error && ( <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-wrap">{error}</div> )}
                {success_message && ( <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success_message}</motion.div> )}
                <div className="mb-8 border-b border-gray-200">
                   <div className="flex space-x-6">
                       <button onClick={() => set_active_tab('profile')} className={`pb-3 px-1 font-medium ${active_tab === 'profile' ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-500 hover:text-gray-800'} transition duration-200`}>Profile</button>
                       <button onClick={() => set_active_tab('preferences')} className={`pb-3 px-1 font-medium ${active_tab === 'preferences' ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-500 hover:text-gray-800'} transition duration-200`}>Architectural Preferences</button>
                       <button onClick={() => set_active_tab('activity')} className={`pb-3 px-1 font-medium ${active_tab === 'activity' ? 'border-b-2 border-pink-500 text-pink-700' : 'text-gray-500 hover:text-gray-800'} transition duration-200`}>Activity</button>
                   </div>
                </div>

                {/* Profile Tab */}
                {active_tab === 'profile' && (
                  <form onSubmit={handle_save_profile}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input id="email" type="email" value={session.user.email || ''} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                        <p className="mt-1 text-xs text-gray-500">Your email cannot be changed here.</p>
                      </div>
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input id="username" name="username" type="text" value={form_data?.username || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                               className={`w-full px-4 py-2 border border-gray-200 rounded-lg ${is_editing ? 'bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} />
                      </div>
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input id="full_name" name="full_name" type="text" value={form_data?.full_name || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                               className={`w-full px-4 py-2 border border-gray-200 rounded-lg ${is_editing ? 'bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} />
                      </div>
                    </div>
                    <div className="mb-8">
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea id="bio" name="bio" rows={4} value={form_data?.bio || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                                  className={`w-full px-4 py-2 border border-gray-200 rounded-lg ${is_editing ? 'bg-white text-gray-900 focus:ring-pink-500 focus:border-pink-500' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                                  placeholder={is_editing ? "Tell us about your architectural interests..." : ""}></textarea>
                    </div>
                    <div className="flex justify-start">
                       {!is_editing ? (
                         <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => set_is_editing(true)} className="px-6 py-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-semibold shadow-md transition duration-200">Edit Profile</motion.button>
                       ) : (
                         <div className="flex space-x-4">
                           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={saving} className={`px-6 py-3 bg-pink-600 text-white rounded-full font-semibold shadow-md transition duration-200 ${saving ? 'opacity-70 cursor-wait' : 'hover:bg-pink-700'}`}>
                             {saving ? 'Saving...' : 'Save Changes'}
                           </motion.button>
                           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => { set_is_editing(false); set_form_data(profile); set_error(null);}} disabled={saving} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-semibold shadow-md transition duration-200">Cancel</motion.button>
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
                                    {available_styles.map((style) => (
                                        <div key={style} onClick={() => !saving && toggle_style(style)}
                                            className={`relative p-4 rounded-lg border ${selected_styles.includes(style) ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-300'} ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} transition duration-200 shadow-sm`}>
                                            <div className="flex items-center">
                                                <div className={`w-5 h-5 rounded-full border ${selected_styles.includes(style) ? 'border-pink-500 bg-pink-500' : 'border-gray-300'} flex items-center justify-center mr-2 flex-shrink-0`}>
                                                    {selected_styles.includes(style) && ( <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> )}
                                                </div>
                                                <span className="text-sm truncate text-gray-800">{style}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-6">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => handle_save_profile()} disabled={saving || loading_styles}
                                        className={`px-6 py-3 bg-pink-600 text-white rounded-full font-semibold shadow-md transition duration-200 ${saving || loading_styles ? 'opacity-70 cursor-wait' : 'hover:bg-pink-700'}`}>
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
                     {loading_activity && (
                         <div className="text-center py-10">
                             <svg className="animate-spin h-8 w-8 text-pink-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             <p className="mt-2 text-gray-600">Loading your activity...</p>
                         </div>
                     )}
                     {!loading_activity && !error && (
                       <>
                         <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 mb-8">
                           <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                             <div className="w-full sm:w-1/3 bg-white rounded-lg shadow-sm p-4 text-center">
                               <div className="text-3xl font-bold text-pink-600 mb-1">{swipe_stats?.total ?? 0}</div>
                               <div className="text-sm text-gray-600">Buildings Viewed</div>
                             </div>
                             <div className="w-full sm:w-1/3 bg-white rounded-lg shadow-sm p-4 text-center">
                               <div className="text-3xl font-bold text-pink-600 mb-1">{swipe_stats?.likes ?? 0}</div>
                               <div className="text-sm text-gray-600">Right Swipes (Likes)</div>
                             </div>
                             <div className="w-full sm:w-1/3 bg-white rounded-lg shadow-sm p-4 text-center">
                               <div className="text-3xl font-bold text-pink-600 mb-1">{swipe_stats?.dislikes ?? 0}</div>
                               <div className="text-sm text-gray-600">Left Swipes (Passes)</div>
                             </div>
                           </div>
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
                           ) : ( <p className="text-gray-500 italic text-sm bg-white p-3 rounded-md shadow-sm">You haven't liked any styles yet!</p> )}
                         </div>
                         <h3 className="font-semibold text-gray-700 mb-3">Recent Activity</h3>
                         {recent_activities.length > 0 ? (
                           <div className="space-y-3 mb-6">
                             {recent_activities.map(activity => (
                               <div key={activity.id} className="bg-white rounded-md p-4 border border-gray-200 shadow-sm flex items-center space-x-4">
                                 <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${activity.direction ? 'bg-pink-100' : 'bg-red-100'}`}>
                                   {activity.direction ? ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                   ) : ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> )}
                                 </div>
                                 <div className="flex-grow">
                                     <div className="font-medium text-gray-800"> You {activity.direction ? 'liked' : 'passed on'} a {activity.styleName} building called <span className="font-semibold italic">{activity.imageName}</span> </div>
                                     <div className="text-sm text-gray-500"> {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })} </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ) : ( <p className="text-gray-500 italic text-sm bg-white p-4 rounded-md shadow-sm border border-gray-200">No recent activity to show.</p> )}
                         <div className="flex justify-center mt-8">
                             <Link href="/swipe" className="inline-flex items-center px-6 py-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-semibold shadow-md transition duration-200">
                                 <span>Continue Swiping</span>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                             </Link>
                         </div>
                       </>
                     )}
                     {!loading_activity && !error && !swipe_stats && recent_activities.length === 0 && top_liked_styles.length === 0 && (
                        <p className="text-gray-500 italic text-center py-6">Could not load activity details.</p>
                     )}
                   </div>
                 )}
            </div>
        </motion.div>
       </section>

       {/* MODIFIED: Footer from page.tsx */}
       <footer className="py-12 bg-slate-900 text-slate-400 relative z-10 mt-12"> {/* Added mt-12 for spacing from content */}
         <div className="container mx-auto px-4 text-center">
           <div className="text-3xl font-bold text-[rgb(var(--primary-rgb))] mb-4">ArchiSwipe</div>
           <p className="mb-2">© {new Date().getFullYear()} ArchiSwipe - Because buildings won't ghost you.</p> {/* Slightly different witty remark */}
           <p className="text-sm mb-6">Warning: May cause serious emotional attachment to inanimate structures.</p>
           <div className="flex justify-center space-x-6 mb-6">
             <a href="#" className="hover:text-[rgb(var(--primary-rgb))] smooth-transition">Terms</a>
             <a href="#" className="hover:text-[rgb(var(--primary-rgb))] smooth-transition">Privacy</a>
             <a href="#" className="hover:text-[rgb(var(--primary-rgb))] smooth-transition">Contact</a>
           </div>
           <p className="text-xs text-slate-500">
             Remember: Even the most beautiful Art Nouveau facade might be hiding serious foundation issues. Swipe responsibly.
           </p>
         </div>
       </footer>
    </main>
  );
}