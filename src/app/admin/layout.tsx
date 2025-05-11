// src/app/admin/layout.tsx
'use client';
import React, { useEffect } from 'react'; // Ensure React is imported
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, BarChart3, LogOut } from 'lucide-react'; // Example icons

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading: isLoadingAuth, supabase } = useAuth(); // Renamed isLoading to isLoadingAuth for clarity
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !session) {
      console.log('AdminLayout: No session, redirecting to /auth');
      router.replace('/auth');
      return;
    }

    if (session && !isLoadingAuth) {
      // Check for admin role using app_metadata
      const isAdmin = session.user?.app_metadata?.roles?.includes('admin');
      console.log('AdminLayout: Session found, isAdmin:', isAdmin, 'User metadata:', session.user?.app_metadata);


      if (!isAdmin) {
        console.warn('AdminLayout: User is not an admin. Redirecting to home.');
        router.replace('/'); // Redirect to home if not admin
      }
    }
  }, [session, isLoadingAuth, router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // AuthContext listener and useEffect above should handle redirect
  };

  // Determine if we should show loading or block content
  // We need to wait for auth to load AND session to be processed for admin check
  const isCheckingPermissions = isLoadingAuth || !session;
  const isAllowed = session && session.user?.app_metadata?.roles?.includes('admin');


  if (isCheckingPermissions) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center">
                <svg className="animate-spin h-10 w-10 text-pink-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-700 font-medium">Loading & Verifying Permissions...</p>
            </div>
        </div>
    );
  }

  if (!isAllowed) {
    // This case should ideally be caught by the redirect, but acts as a fallback
    // or can be shown briefly before redirect takes full effect.
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <p className="text-slate-700 font-medium">Access Denied. Redirecting...</p>
        </div>
    );
  }

  // If loading is done, session exists, and user is admin, render the layout
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/admin/trends" className="text-xl font-bold hover:text-pink-300 transition-colors flex items-center">
            <LayoutDashboard size={24} className="mr-2" />
            ArchiSwipe Admin
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/admin/trends" className="px-3 py-2 hover:bg-slate-700 rounded-md transition-colors text-sm font-medium flex items-center">
                <BarChart3 size={18} className="mr-1.5" /> Trends
            </Link>
            {/* Add more admin nav links here later */}
            <button
                onClick={handleSignOut}
                className="ml-4 px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded-md transition-colors text-sm font-medium flex items-center"
            >
                <LogOut size={18} className="mr-1.5" /> Sign Out
            </button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="bg-slate-800 text-slate-400 text-center p-6 mt-auto">
        © {new Date().getFullYear()} ArchiSwipe Admin Panel
      </footer>
    </div>
  );
}