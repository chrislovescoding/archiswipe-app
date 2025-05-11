// src/app/admin/trends/page.tsx
'use client'; // This page will fetch data on the client

import React, { useEffect, useState } from 'react'; // Ensure React is imported
import { useAuth } from '@/app/context/AuthContext'; // To get the Supabase client

// Define interfaces for the data we expect from our RPCs
interface GlobalPlatformStats {
  totalUsers: number;
  totalSwipes: number;
  totalLikes: number;
  platformLikeRatio: number;
}

interface GlobalStylePopularity {
  name: string;
  total_likes: number;
  total_passes: number;
  total_views: number;
}

// Helper component for displaying individual stat cards in the admin panel
const AdminStatCard: React.FC<{ title: string; value: string | number; subtext?: string }> = ({ title, value, subtext }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 hover:shadow-pink-100 transition-shadow duration-300">
    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
    <p className="text-4xl font-bold text-pink-600 mt-2">{value?.toLocaleString()}</p> {/* Added toLocaleString for numbers */}
    {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
  </div>
);

export default function AdminTrendsPage() {
  const { supabase, session } = useAuth(); // Get Supabase client and session
  const [platformStats, setPlatformStats] = useState<GlobalPlatformStats | null>(null);
  const [stylePopularity, setStylePopularity] = useState<GlobalStylePopularity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The AdminLayout should handle the core auth and admin role check.
    // This page assumes it's only rendered if the user is an authenticated admin.
    if (!supabase || !session) {
      // If for some reason supabase or session is not available, don't attempt to fetch.
      // This scenario should ideally be caught by AdminLayout redirecting.
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch platform overview stats
        const platformStatsPromise = supabase.rpc('get_overall_platform_stats');
        // Fetch style popularity (e.g., top 10)
        const stylePopularityPromise = supabase.rpc('get_global_style_popularity', { limit_count: 10 });

        // Await both promises
        const [platformStatsRes, stylePopularityRes] = await Promise.all([
          platformStatsPromise,
          stylePopularityPromise
        ]);

        // Check for errors from the platform stats RPC
        if (platformStatsRes.error) {
          console.error('Platform Stats RPC Error:', platformStatsRes.error);
          throw new Error(`Failed to load platform stats: ${platformStatsRes.error.message}`);
        }
        setPlatformStats(platformStatsRes.data);

        // Check for errors from the style popularity RPC
        if (stylePopularityRes.error) {
          console.error('Style Popularity RPC Error:', stylePopularityRes.error);
          throw new Error(`Failed to load style popularity: ${stylePopularityRes.error.message}`);
        }
        setStylePopularity(stylePopularityRes.data || []); // Ensure it's an array even if data is null

      } catch (err: any) {
        console.error("Admin Trends Page - Data Fetch Error:", err);
        setError(err.message); // Set the error state to display to the user
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, session]); // Re-run if supabase client or session changes

  // Loading State UI
  if (loading) {
    return (
        <div className="text-center py-20 flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-pink-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-700 font-medium text-lg">Loading Admin Dashboard...</p>
        </div>
    );
  }

  // Error State UI
  if (error) {
    return (
        <div className="text-center py-10 text-red-700 bg-red-100 p-6 rounded-lg shadow-md border border-red-300">
            <h2 className="text-xl font-semibold mb-2">Oops! Something went wrong.</h2>
            <p>Error loading admin data: {error}</p>
            <p className="mt-4 text-sm">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
    );
  }

  // Main content when data is loaded
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-slate-800 border-b-2 border-pink-500 pb-2">Platform Analytics Dashboard</h1>

      {/* Platform Overview Section */}
      {platformStats && (
        <section>
          <h2 className="text-2xl font-semibold text-slate-700 mb-6">Platform Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminStatCard title="Total Users" value={platformStats.totalUsers} />
            <AdminStatCard title="Total Swipes" value={platformStats.totalSwipes} />
            <AdminStatCard title="Total Likes" value={platformStats.totalLikes} />
            <AdminStatCard title="Platform Like Ratio" value={`${platformStats.platformLikeRatio}%`} />
          </div>
        </section>
      )}

      {/* Style Popularity Section */}
      <section>
        <h2 className="text-2xl font-semibold text-slate-700 mb-6">Most Popular Styles (Top 10 by Likes)</h2>
        {stylePopularity.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-lg shadow-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Style Name</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Likes</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Passes</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Views</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {stylePopularity.map((style) => (
                  <tr key={style.name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{style.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{style.total_likes.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{style.total_passes.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{style.total_views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 bg-white p-6 rounded-lg shadow border">No style popularity data available yet. This could be because there are no styles, no images linked to styles, or no swipe data.</p>
        )}
      </section>
      {/* Future sections for other admin stats can be added here */}
    </div>
  );
}