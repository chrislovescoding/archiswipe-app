// src/app/profile/page.tsx
'use client';

import React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Users as UsersIcon,
  Compass as CompassIcon,
  Heart as HeartIconLucide, // For StatCard
  X as XIcon,               // For StatCard
  Percent as PercentIcon,   // For StatCard
  Sparkles as SparklesIcon, // For StatCard
  Building as BuildingIcon, // For StatCard
  Edit3 as EditIcon,        // For avatar edit
  Camera as CameraIcon,     // For avatar edit icon
  LogOut as LogOutIcon,     // For sign out
  Activity as ActivityIcon, // For tabs
  Settings as SettingsIcon, // For tabs
  User as UserIconRegular,  // For tabs
  ChevronRightIcon         // For continue swiping button
} from 'lucide-react';

// --- Types ---
interface ProfileData {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  architectural_preferences: string[] | null;
}
interface Style { name: string; }

// NEW: Type for the RPC response
interface RecentActivityItemFromRPC {
  id: number;
  direction: boolean;
  imageName: string;
  styleName: string;
  timestamp: string;
}

interface UserActivitySummary {
  totalSwipes: number;
  totalLikes: number;
  totalDislikes: number;
  likeRatio: number;
  topLikedStyles: { name: string; likes: number }[];
  topDislikedStyles: { name: string; dislikes: number }[];
  discoveredStyleCount: number;
  recentActivity: RecentActivityItemFromRPC[];
}


// --- Simple Heart component for background decoration (copied from page.tsx) ---
const HeartBG = ({ className = '' }: { className?: string }) => (
  <div className={`absolute text-[rgb(var(--primary-rgb))] ${className}`}>❤️</div>
);

// --- StatCard Component (Helper for Activity Tab) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode; // Allow passing any Lucide icon or custom SVG
  bgColor?: string; // Optional background color for the icon container
  textColor?: string; // Optional text color for the icon
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColor = "bg-pink-100", textColor = "text-pink-600" }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-lg border border-pink-100 hover:shadow-pink-200/50 transition-shadow duration-300 flex flex-col items-center text-center h-full">
      {icon && (
        <div className={`p-3 rounded-full ${bgColor} mb-3`}>
          {React.cloneElement(icon as React.ReactElement, { className: `h-6 w-6 ${textColor}` })}
        </div>
      )}
      <div className="text-3xl font-bold text-pink-600 mb-1">{value}</div>
      <div className="text-sm text-gray-500 leading-tight">{title}</div>
    </div>
  );
};


export default function ProfilePage() {
  const { session, supabase, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const [profile, set_profile] = useState<ProfileData | null>(null);
  const [loading_profile, set_loading_profile] = useState(false);
  const [error, set_error] = useState<string | null>(null); // General error for the page
  const [activityError, setActivityError] = useState<string | null>(null); // Specific error for activity tab
  const [is_editing, set_is_editing] = useState(false);
  const [form_data, set_form_data] = useState<ProfileData | null>(null);
  const [saving, set_saving] = useState(false);
  const [active_tab, set_active_tab] = useState<'profile' | 'preferences' | 'activity'>('profile');
  const [selected_styles, set_selected_styles] = useState<string[]>([]);
  const [available_styles, set_available_styles] = useState<string[]>([]);
  const [loading_styles, set_loading_styles] = useState(false);
  const [success_message, set_success_message] = useState<string | null>(null);

  // NEW State for Activity Summary
  const [summary_data, set_summary_data] = useState<UserActivitySummary | null>(null);
  const [loading_summary, set_loading_summary] = useState(false);

  const profile_fetch_attempted = useRef(false);
  const styles_fetch_attempted = useRef(false);
  const summary_fetch_attempted = useRef(false); // Changed from activity_fetch_attempted


  const navLinkBase = "px-4 py-2 rounded-full font-medium smooth-transition text-sm shadow-sm hover:shadow-md";
  const navLinkSecondary = `${navLinkBase} bg-white text-[rgb(var(--primary-text-soft-rgb))] border border-[rgba(var(--primary-light-rgb),0.5)] hover:bg-[rgba(var(--primary-light-rgb),0.2)]`;
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
            if (profile_error.code === 'PGRST116') { // Profile does not exist, create one
              const new_profile_data_insert = {
                id: session.user.id,
                username: session.user.email?.split('@')[0] || `user_${session.user.id.substring(0,6)}`, // Default username
                full_name: null, avatar_url: null, bio: null, architectural_preferences: [],
              };
              const { error: insert_error } = await supabase.from('profiles').insert(new_profile_data_insert);
              if (insert_error) throw insert_error;
              const { id, ...new_profile_state } = new_profile_data_insert;
              set_profile(new_profile_state); set_form_data(new_profile_state); set_selected_styles([]);
            } else { throw profile_error; }
          } else if (data) {
            set_profile(data); set_form_data(data); set_selected_styles(data.architectural_preferences || []);
          }
        } catch (err: any) {
          set_error(`Failed to load profile: ${err.message || 'Unknown error'}`); set_profile(null);
        } finally { set_loading_profile(false); }
      };
      fetch_user_profile();
    }
    if (!session) { // Reset states if session is lost
      profile_fetch_attempted.current = false; styles_fetch_attempted.current = false; summary_fetch_attempted.current = false;
      set_profile(null); set_form_data(null); set_selected_styles([]); set_available_styles([]);
      set_summary_data(null);
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
  }, [supabase, loading_styles, available_styles.length]); // Added available_styles.length to re-fetch if it's empty

  // UPDATED: Fetch Activity Summary Data using RPC
  useEffect(() => {
    if (active_tab === 'activity' && session && supabase && !loading_summary && !summary_fetch_attempted.current) {
      set_loading_summary(true);
      summary_fetch_attempted.current = true;
      setActivityError(null); // Clear specific activity errors

      const fetch_summary_data = async () => {
        try {
          const { data, error: rpcError } = await supabase.rpc('get_user_activity_summary', {
            user_id_param: session.user.id,
          });

          if (rpcError) {
            throw new Error(`RPC Error: ${rpcError.message}`);
          }
          if (data) {
            set_summary_data(data as UserActivitySummary);
          } else {
            set_summary_data(null);
          }
        } catch (err: any) {
          setActivityError(`Failed to load activity summary: ${err.message}`);
          set_summary_data(null);
        } finally {
          set_loading_summary(false);
        }
      };
      fetch_summary_data();
    }
    if (active_tab !== 'activity') {
      summary_fetch_attempted.current = false; // Reset if tab changes so it can re-fetch
    }
  }, [active_tab, session, supabase, loading_summary]);


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
      const { error: update_error } = await supabase.from('profiles').upsert(updates).eq('id', session.user.id); // Use upsert
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
        // Check if an old avatar exists to delete it, except if it's a placeholder
        if (profile?.avatar_url && !profile.avatar_url.includes('placehold.co')) {
            const old_avatar_path_parts = profile.avatar_url.split('/');
            const old_avatar_name = old_avatar_path_parts.pop();
            const old_avatar_user_folder = old_avatar_path_parts.pop();
            if (old_avatar_name && old_avatar_user_folder === session.user.id) { // Make sure it's in the user's folder
                 await supabase.storage.from('avatars').remove([`${session.user.id}/${old_avatar_name}`]);
            }
        }

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
    // AuthContext listener should handle redirecting to /auth
  };


  if (isLoadingAuth || (session && loading_profile && !profile && profile_fetch_attempted.current)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center animate-pulse">
                <UserIconRegular className="h-12 w-12 text-pink-400" />
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

  if (!session) return null; // Auth redirect is handled by useEffect

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 text-slate-700">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-80">
        <HeartBG className="top-20 left-10 w-64 h-64 blur-3xl animate-pulse-slow animation-delay-2000" />
        <HeartBG className="bottom-20 right-10 w-96 h-96 blur-3xl animate-pulse-slow animation-delay-4000" />
      </div>

       <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
         <div className="container mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center py-4">
             <Link href="/" className="text-3xl font-bold text-[rgb(var(--primary-rgb))]">ArchiSwipe</Link>
             <nav className="flex space-x-3 items-center">
               <Link href="/swipe" className={navLinkSecondary}>
                  <CompassIcon size={18} className="inline mr-1" /> Swipe
               </Link>
               <button onClick={handle_sign_out} className={`${navLinkPrimary} flex items-center`}>
                 <LogOutIcon size={18} className="inline mr-1.5" /> Sign Out
               </button>
             </nav>
           </div>
         </div>
       </header>

       <section className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl overflow-hidden border border-pink-100"
        >
            <div className="h-40 sm:h-48 bg-gradient-to-r from-pink-400 to-rose-500 relative">
                <div className="absolute -bottom-12 sm:-bottom-16 left-6 sm:left-10">
                    <div className="relative group">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-pink-100 flex items-center justify-center overflow-hidden shadow-lg">
                            {loading_profile && is_editing ? (
                                 <svg className="animate-spin h-8 w-8 text-pink-500" /* ... */></svg>
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                            ) : ( <UserIconRegular className="h-12 w-12 sm:h-16 sm:w-16 text-pink-400" /> )}
                        </div>
                        {is_editing && (
                            <label htmlFor="avatar-upload" className={`absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-pink-600 transition duration-200 border-2 border-white ${loading_profile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handle_avatar_upload} disabled={loading_profile} />
                            </label>
                        )}
                    </div>
                </div>
                 <div className="absolute top-4 right-6">
                    {!is_editing ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => set_is_editing(true)}
                            className="px-4 py-2 bg-white/20 text-white rounded-full hover:bg-white/30 backdrop-blur-sm font-semibold shadow-md transition duration-200 text-sm flex items-center"
                        >
                            <EditIcon size={16} className="mr-1.5" /> Edit Profile
                        </motion.button>
                    ) : (
                        <div className="flex space-x-2">
                           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={handle_save_profile} disabled={saving} className={`px-4 py-2 bg-green-500 text-white rounded-full font-semibold shadow-md transition duration-200 text-sm ${saving ? 'opacity-70 cursor-wait' : 'hover:bg-green-600'}`}>
                             {saving ? 'Saving...' : 'Save'}
                           </motion.button>
                           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => { set_is_editing(false); set_form_data(profile); set_error(null);}} disabled={saving} className="px-4 py-2 bg-gray-500/50 text-white rounded-full hover:bg-gray-500/70 backdrop-blur-sm font-semibold shadow-md transition duration-200 text-sm">Cancel</motion.button>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-16 sm:pt-20 pb-8 sm:pb-10 px-6 sm:px-10">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">{profile?.full_name || profile?.username || "ArchiSwiper"}</h1>
                <p className="text-sm text-slate-500 mb-6">@{profile?.username || session.user.email}</p>

                {error && ( <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-wrap">{error}</div> )}
                {success_message && ( <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success_message}</motion.div> )}

                <div className="mb-8 border-b border-gray-200">
                   <div className="flex space-x-2 sm:space-x-4">
                       {[
                           { id: 'profile', label: 'Profile', icon: <UserIconRegular size={18}/> },
                           { id: 'preferences', label: 'Preferences', icon: <SettingsIcon size={18}/> },
                           { id: 'activity', label: 'Activity', icon: <ActivityIcon size={18}/> },
                       ].map(tab => (
                           <button
                               key={tab.id}
                               onClick={() => set_active_tab(tab.id as any)}
                               className={`pb-3 px-2 sm:px-3 font-medium flex items-center space-x-1.5 ${active_tab === tab.id ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500 hover:text-gray-800'} transition-colors duration-200 text-sm sm:text-base`}
                           >
                               {tab.icon}
                               <span>{tab.label}</span>
                           </button>
                       ))}
                   </div>
                </div>

                {/* Profile Tab */}
                {active_tab === 'profile' && (
                  <form onSubmit={handle_save_profile}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input id="email" type="email" value={session.user.email || ''} disabled className="w-full px-4 py-2.5 bg-gray-100 border-gray-300 rounded-lg cursor-not-allowed text-gray-600 text-sm" />
                      </div>
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input id="username" name="username" type="text" value={form_data?.username || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                               className={`w-full px-4 py-2.5 border rounded-lg text-sm ${is_editing ? 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'}`} />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input id="full_name" name="full_name" type="text" value={form_data?.full_name || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                               className={`w-full px-4 py-2.5 border rounded-lg text-sm ${is_editing ? 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'}`} />
                      </div>
                    </div>
                    <div className="mb-6">
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea id="bio" name="bio" rows={3} value={form_data?.bio || ''} onChange={handle_input_change} disabled={!is_editing || saving}
                                  className={`w-full px-4 py-2.5 border rounded-lg text-sm ${is_editing ? 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500 focus:border-pink-500' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'}`}
                                  placeholder={is_editing ? "Tell us about your architectural interests..." : "No bio yet."}></textarea>
                    </div>
                    {/* Save/Cancel buttons are moved to the header for edit mode */}
                   </form>
                )}

                {/* Preferences Tab */}
                {active_tab === 'preferences' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Architectural Preferences</h2>
                        <p className="text-gray-600 mb-6 text-sm">Select styles you love. This helps us match you with buildings you'll adore!</p>
                        {loading_styles && <p className="text-gray-500 italic text-sm">Loading styles...</p>}
                        {!loading_styles && available_styles.length === 0 && !error && <p className="text-gray-500 text-sm">No architectural styles found.</p>}
                        {available_styles.length > 0 && (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                                    {available_styles.map((style) => (
                                        <div key={style} onClick={() => !saving && toggle_style(style)}
                                            className={`relative p-3 rounded-lg border ${selected_styles.includes(style) ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-300 bg-white hover:border-pink-400 hover:bg-pink-50/50'} ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} transition duration-200 shadow-sm flex items-center`}>
                                            <div className={`w-4 h-4 rounded-full border-2 ${selected_styles.includes(style) ? 'border-pink-500 bg-pink-500' : 'border-gray-400'} flex items-center justify-center mr-2 flex-shrink-0`}>
                                                {selected_styles.includes(style) && ( <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 16 16"><path d="M13.485 4.515a.5.5 0 0 0-.707-.03L6.5 10.258 3.222 7.01a.5.5 0 0 0-.758.652l3.5 3.5a.5.5 0 0 0 .724.017l7-6.5a.5.5 0 0 0 .03-.707z"/></svg> )}
                                            </div>
                                            <span className="text-xs sm:text-sm truncate">{style}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-6">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => handle_save_profile()} disabled={saving || loading_styles}
                                        className={`px-6 py-2.5 bg-pink-600 text-white rounded-full font-semibold shadow-md transition duration-200 text-sm ${saving || loading_styles ? 'opacity-70 cursor-wait' : 'hover:bg-pink-700'}`}>
                                        {saving ? 'Saving...' : 'Save Preferences'}
                                    </motion.button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Activity Tab - UPDATED */}
                {active_tab === 'activity' && (
                   <div>
                     <h2 className="text-xl font-semibold text-gray-800 mb-6">Your ArchiSwipe Activity</h2>
                     {loading_summary && (
                         <div className="text-center py-10">
                             <svg className="animate-spin h-8 w-8 text-pink-500 mx-auto" /* ... */ ></svg>
                             <p className="mt-2 text-gray-600">Loading your activity summary...</p>
                         </div>
                     )}
                     {!loading_summary && activityError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-wrap">
                            Error: {activityError}
                        </div>
                     )}
                     {!loading_summary && !activityError && summary_data && (
                       <>
                         {/* Overall Stats Section */}
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                            <StatCard title="Buildings Viewed" value={summary_data.totalSwipes} icon={<BuildingIcon />} />
                            <StatCard title="Right Swipes" value={summary_data.totalLikes} icon={<HeartIconLucide />} />
                            <StatCard title="Left Swipes" value={summary_data.totalDislikes} icon={<XIcon />} bgColor="bg-red-100" textColor="text-red-600" />
                            <StatCard title="Like Ratio" value={`${summary_data.likeRatio}%`} icon={<PercentIcon />} bgColor="bg-blue-100" textColor="text-blue-600" />
                            <StatCard title="Styles Discovered" value={summary_data.discoveredStyleCount} icon={<SparklesIcon />} bgColor="bg-yellow-100" textColor="text-yellow-600" />
                         </div>

                         {/* Top Liked & Disliked Styles Section */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-10">
                           <div>
                             <h3 className="font-semibold text-slate-700 mb-3 text-lg">Your Top Liked Styles</h3>
                             {summary_data.topLikedStyles.length > 0 ? (
                               <ul className="space-y-2.5">
                                 {summary_data.topLikedStyles.map(style => (
                                   <li key={`liked-${style.name}`} className="bg-white rounded-lg p-3.5 flex justify-between items-center shadow-sm border border-gray-200 hover:border-pink-300 transition-colors">
                                     <span className="font-medium text-slate-800 text-sm">{style.name}</span>
                                     <span className="px-2.5 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-semibold">{style.likes} {style.likes === 1 ? 'like' : 'likes'}</span>
                                   </li>
                                 ))}
                               </ul>
                             ) : (<p className="text-gray-500 italic text-sm bg-white p-3.5 rounded-lg shadow-sm border">You haven't liked any styles yet!</p>)}
                           </div>
                           <div>
                             <h3 className="font-semibold text-slate-700 mb-3 text-lg">Your Top Passed Styles</h3>
                             {summary_data.topDislikedStyles.length > 0 ? (
                               <ul className="space-y-2.5">
                                 {summary_data.topDislikedStyles.map(style => (
                                   <li key={`disliked-${style.name}`} className="bg-white rounded-lg p-3.5 flex justify-between items-center shadow-sm border border-gray-200 hover:border-red-300 transition-colors">
                                     <span className="font-medium text-slate-800 text-sm">{style.name}</span>
                                     <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{style.dislikes} {style.dislikes === 1 ? 'pass' : 'passes'}</span>
                                   </li>
                                 ))}
                               </ul>
                             ) : (<p className="text-gray-500 italic text-sm bg-white p-3.5 rounded-lg shadow-sm border">You haven't passed on many styles yet!</p>)}
                           </div>
                         </div>

                         {/* Recent Activity Section */}
                         <h3 className="font-semibold text-slate-700 mb-4 text-lg">Recent Activity</h3>
                         {summary_data.recentActivity.length > 0 ? (
                           <div className="space-y-3">
                             {summary_data.recentActivity.map(activity => (
                               <div key={activity.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow">
                                 <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${activity.direction ? 'bg-pink-100' : 'bg-red-100'}`}>
                                   {activity.direction ? ( <HeartIconLucide className="h-5 w-5 text-pink-500" />
                                   ) : ( <XIcon className="h-5 w-5 text-red-500" /> )}
                                 </div>
                                 <div className="flex-grow">
                                     <p className="font-medium text-slate-700 text-sm leading-tight">
                                        You {activity.direction ? 'liked' : 'passed on'}
                                        <span className="font-semibold text-pink-600"> {activity.styleName || 'a building'}</span>
                                        {activity.imageName && activity.imageName !== 'Unknown Image' ? ` (image: ${activity.imageName})` : ''}.
                                     </p>
                                     <p className="text-xs text-gray-500 mt-0.5">
                                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                     </p>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ) : ( <p className="text-gray-500 italic text-sm bg-white p-4 rounded-lg shadow-sm border">No recent activity to show.</p> )}

                         <div className="flex justify-center mt-10">
                             <Link href="/swipe" className="inline-flex items-center px-6 py-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-semibold shadow-lg transition duration-200 transform hover:scale-105 text-base">
                                 <span>Continue Swiping</span>
                                 <ChevronRightIcon size={20} className="ml-1.5" />
                             </Link>
                         </div>
                       </>
                     )}
                     {!loading_summary && !activityError && !summary_data && (
                        <p className="text-gray-500 italic text-center py-6">Could not load activity details or no activity yet.</p>
                     )}
                   </div>
                 )}
            </div>
        </motion.div>
       </section>

       <footer className="py-12 bg-slate-900 text-slate-400 relative z-10 mt-12">
         <div className="container mx-auto px-4 text-center">
           <div className="text-3xl font-bold text-[rgb(var(--primary-rgb))] mb-4">ArchiSwipe</div>
           <p className="mb-2">© {new Date().getFullYear()} ArchiSwipe - Building dreams, one swipe at a time.</p>
           <p className="text-sm mb-6">Warning: May cause an incurable passion for architecture.</p>
           <div className="flex justify-center space-x-6 mb-6">
             <a href="#" className="hover:text-[rgb(var(--primary-rgb))] smooth-transition">Terms</a>
             <a href="#" className="hover:text-[rgb(var(--primary-rgb))] smooth-transition">Privacy</a>
             <a href="#" className="hover:text-[rgb(var(--primary-rgb))] smooth-transition">Contact</a>
           </div>
           <p className="text-xs text-slate-500">
             Swipe responsibly. Emotional attachment to gables and cornices is a known side effect.
           </p>
         </div>
       </footer>
    </main>
  );
}