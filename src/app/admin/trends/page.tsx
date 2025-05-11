// src/app/admin/trends/page.tsx
'use client'; 

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext'; 
import { Clock as ClockIcon, Image as ImageIcon, TrendingUp, TrendingDown } from 'lucide-react'; 

// --- Interfaces ---
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

interface GlobalSwipeCadence {
  global_avg_swipe_time_ms: number | null;
  total_timed_swipes: number | null;
}

// NEW: Interface for image performance RPC
interface ImagePerformanceItem {
  image_id: number;
  storage_path: string;
  style_name: string | null;
  total_swipes: number;
  total_likes: number;
  like_ratio: number;
  performance_rank: 'top' | 'least';
}

// NEW: Interface for avg time per style RPC
interface AvgTimePerStyleItem {
  style_id: number;
  style_name: string;
  avg_time_on_card_ms: number | null;
  total_timed_swipes_for_style: number;
}


// --- Helper Components & Functions ---
const AdminStatCard: React.FC<{ title: string; value: string | number; subtext?: string; icon?: React.ReactNode; bgColor?: string; textColor?: string; }> = 
  ({ title, value, subtext, icon, bgColor = "bg-pink-100", textColor = "text-pink-600" }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 hover:shadow-pink-100 transition-shadow duration-300">
    {icon && (
        <div className={`p-3 w-fit rounded-full ${bgColor} mb-3`}>
          {React.cloneElement(icon as React.ReactElement, { className: `h-5 w-5 ${textColor}` })}
        </div>
      )}
    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
    <p className="text-4xl font-bold text-pink-600 mt-2">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
  </div>
);

const formatMsToSeconds = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return 'N/A';
  return (ms / 1000).toFixed(1); 
};

// Helper to get public URL for Supabase Storage images
const getSupabaseImageUrl = (storagePath: string, supabaseClient: any): string | null => {
    if (!storagePath || !supabaseClient) return null;
    // Assuming 'house-images' is your bucket name
    const { data } = supabaseClient.storage.from('house-images').getPublicUrl(decodeURIComponent(storagePath));
    return data?.publicUrl || null;
};


// --- Main Component ---
export default function AdminTrendsPage() {
  const { supabase, session } = useAuth(); 
  const [platformStats, setPlatformStats] = useState<GlobalPlatformStats | null>(null);
  const [stylePopularity, setStylePopularity] = useState<GlobalStylePopularity[]>([]);
  const [globalCadence, setGlobalCadence] = useState<GlobalSwipeCadence | null>(null);
  // NEW: State for image performance
  const [imagePerformance, setImagePerformance] = useState<ImagePerformanceItem[]>([]);
  // NEW: State for avg time per style
  const [avgTimePerStyle, setAvgTimePerStyle] = useState<AvgTimePerStyleItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const IMAGE_PERFORMANCE_LIMIT = 5; // How many top/least images to fetch

  useEffect(() => {
    if (!supabase || !session) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      let partialError = null; // To store non-critical errors

      try {
        const platformStatsPromise = supabase.rpc('get_overall_platform_stats');
        const stylePopularityPromise = supabase.rpc('get_global_style_popularity', { limit_count: 10 });
        const globalCadencePromise = supabase.rpc('admin_get_global_swipe_cadence');
        // NEW: RPC calls
        const imagePerformancePromise = supabase.rpc('admin_get_image_performance', { result_limit: IMAGE_PERFORMANCE_LIMIT });
        const avgTimePerStylePromise = supabase.rpc('admin_get_avg_time_per_style');


        const [
            platformStatsRes, 
            stylePopularityRes, 
            globalCadenceRes,
            imagePerformanceRes, // NEW
            avgTimePerStyleRes   // NEW
        ] = await Promise.allSettled([ // Use Promise.allSettled to get all results even if some fail
          platformStatsPromise,
          stylePopularityPromise,
          globalCadencePromise,
          imagePerformancePromise,
          avgTimePerStylePromise
        ]);

        // Process platformStatsRes
        if (platformStatsRes.status === 'fulfilled' && !platformStatsRes.value.error) {
          const rawPlatformStats = platformStatsRes.value.data;
          if (Array.isArray(rawPlatformStats) && rawPlatformStats.length > 0) {
            setPlatformStats(rawPlatformStats[0] as GlobalPlatformStats);
          } else if (rawPlatformStats && typeof rawPlatformStats === 'object' && !Array.isArray(rawPlatformStats)) {
            setPlatformStats(rawPlatformStats as GlobalPlatformStats);
          } else { setPlatformStats(null); }
        } else {
          console.error('Platform Stats RPC Error:', platformStatsRes.status === 'rejected' ? platformStatsRes.reason : platformStatsRes.value.error);
          partialError = partialError ? `${partialError}\nFailed to load platform stats.` : 'Failed to load platform stats.';
          setPlatformStats(null);
        }

        // Process stylePopularityRes
        if (stylePopularityRes.status === 'fulfilled' && !stylePopularityRes.value.error) {
          setStylePopularity(stylePopularityRes.value.data || []);
        } else {
          console.error('Style Popularity RPC Error:', stylePopularityRes.status === 'rejected' ? stylePopularityRes.reason : stylePopularityRes.value.error);
          partialError = partialError ? `${partialError}\nFailed to load style popularity.` : 'Failed to load style popularity.';
          setStylePopularity([]);
        }
        
        // Process globalCadenceRes
        if (globalCadenceRes.status === 'fulfilled' && !globalCadenceRes.value.error) {
          const rawGlobalCadence = globalCadenceRes.value.data;
           if (Array.isArray(rawGlobalCadence) && rawGlobalCadence.length > 0) {
            setGlobalCadence(rawGlobalCadence[0] as GlobalSwipeCadence);
          } else if (rawGlobalCadence && typeof rawGlobalCadence === 'object' && !Array.isArray(rawGlobalCadence)) {
            setGlobalCadence(rawGlobalCadence as GlobalSwipeCadence);
          } else { setGlobalCadence(null); }
        } else {
          console.error('Global Cadence RPC Error:', globalCadenceRes.status === 'rejected' ? globalCadenceRes.reason : globalCadenceRes.value.error);
          partialError = partialError ? `${partialError}\nFailed to load global cadence.` : 'Failed to load global cadence.';
          setGlobalCadence(null);
        }

        // NEW: Process imagePerformanceRes
        if (imagePerformanceRes.status === 'fulfilled' && !imagePerformanceRes.value.error) {
          setImagePerformance(imagePerformanceRes.value.data || []);
        } else {
          console.error('Image Performance RPC Error:', imagePerformanceRes.status === 'rejected' ? imagePerformanceRes.reason : imagePerformanceRes.value.error);
          partialError = partialError ? `${partialError}\nFailed to load image performance.` : 'Failed to load image performance.';
          setImagePerformance([]);
        }

        // NEW: Process avgTimePerStyleRes
        if (avgTimePerStyleRes.status === 'fulfilled' && !avgTimePerStyleRes.value.error) {
          setAvgTimePerStyle(avgTimePerStyleRes.value.data || []);
        } else {
          console.error('Avg Time Per Style RPC Error:', avgTimePerStyleRes.status === 'rejected' ? avgTimePerStyleRes.reason : avgTimePerStyleRes.value.error);
          partialError = partialError ? `${partialError}\nFailed to load average time per style.` : 'Failed to load average time per style.';
          setAvgTimePerStyle([]);
        }

        if(partialError) setError(partialError);

      } catch (err: any) { // Catch for Promise.all if not using allSettled, or other general errors
        console.error("Admin Trends Page - General Data Fetch Error:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, session]); 

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
  
  // If there's a general error and no data at all was loaded, show a full error message
  if (error && !platformStats && !globalCadence && imagePerformance.length === 0 && avgTimePerStyle.length === 0) {
    return (
        <div className="text-center py-10 text-red-700 bg-red-100 p-6 rounded-lg shadow-md border border-red-300">
            <h2 className="text-xl font-semibold mb-2">Oops! Something went wrong.</h2>
            <p>Error loading admin data: {error}</p>
            <p className="mt-4 text-sm">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
    );
  }

  const topPerformingImages = imagePerformance.filter(img => img.performance_rank === 'top');
  const leastPerformingImages = imagePerformance.filter(img => img.performance_rank === 'least');

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-slate-800 border-b-2 border-pink-500 pb-2">Platform Analytics Dashboard</h1>

      {error && ( // Show partial error message if some data loaded but not all
         <div className="my-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
            Note: Some data sections might have failed to load. Details: {error}
        </div>
      )}

      {platformStats || globalCadence ? (
        <section>
          <h2 className="text-2xl font-semibold text-slate-700 mb-6">Platform Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {platformStats && (
              <>
                <AdminStatCard title="Total Users" value={platformStats.totalUsers} />
                <AdminStatCard title="Total Swipes" value={platformStats.totalSwipes} />
                <AdminStatCard title="Total Likes" value={platformStats.totalLikes} />
                <AdminStatCard title="Platform Like Ratio" value={`${(platformStats.platformLikeRatio || 0).toFixed(1)}%`} />
              </>
            )}
            {globalCadence && (
              <AdminStatCard 
                title="Global Avg. Decision Time" 
                value={formatMsToSeconds(globalCadence.global_avg_swipe_time_ms)} 
                subtext={`seconds (from ${globalCadence.total_timed_swipes?.toLocaleString() || 0} swipes)`}
                icon={<ClockIcon />}
                bgColor="bg-indigo-100" 
                textColor="text-indigo-600"
              />
            )}
             {(!platformStats && !globalCadence) && (
                <p className="text-slate-500 col-span-full">Platform overview data is currently unavailable.</p>
             )}
          </div>
        </section>
      ) : (
        !loading && <section><h2 className="text-2xl font-semibold text-slate-700 mb-6">Platform Overview</h2><p className="text-slate-500 bg-white p-6 rounded-lg shadow border">Platform overview data could not be loaded.</p></section>
      )}

      {/* NEW: Image Performance Section */}
      <section>
        <h2 className="text-2xl font-semibold text-slate-700 mb-6">Image Performance (Top {IMAGE_PERFORMANCE_LIMIT} & Least {IMAGE_PERFORMANCE_LIMIT})</h2>
        {imagePerformance.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-medium text-green-600 mb-3 flex items-center"><TrendingUp className="mr-2"/> Top Performing Images</h3>
              <div className="space-y-3">
                {topPerformingImages.map(img => (
                  <div key={`top-${img.image_id}`} className="bg-white p-4 rounded-lg shadow border border-slate-200 flex items-start space-x-4">
                    {getSupabaseImageUrl(img.storage_path, supabase) && (
                        <img 
                            src={getSupabaseImageUrl(img.storage_path, supabase)!} 
                            alt={`Image ${img.image_id}`} 
                            className="w-20 h-20 object-cover rounded-md flex-shrink-0" 
                        />
                    )}
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-slate-700">Image ID: {img.image_id}</p>
                      <p className="text-xs text-slate-500">Style: {img.style_name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Swipes: {img.total_swipes.toLocaleString()}, Likes: {img.total_likes.toLocaleString()}</p>
                      <p className="text-sm font-bold text-green-500">Like Ratio: {img.like_ratio}%</p>
                    </div>
                  </div>
                ))}
                {topPerformingImages.length === 0 && <p className="text-slate-500">No top performing images data.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-medium text-red-600 mb-3 flex items-center"><TrendingDown className="mr-2"/> Least Performing Images</h3>
              <div className="space-y-3">
                {leastPerformingImages.map(img => (
                  <div key={`least-${img.image_id}`} className="bg-white p-4 rounded-lg shadow border border-slate-200 flex items-start space-x-4">
                     {getSupabaseImageUrl(img.storage_path, supabase) && (
                        <img 
                            src={getSupabaseImageUrl(img.storage_path, supabase)!} 
                            alt={`Image ${img.image_id}`} 
                            className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                        />
                    )}
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-slate-700">Image ID: {img.image_id}</p>
                      <p className="text-xs text-slate-500">Style: {img.style_name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Swipes: {img.total_swipes.toLocaleString()}, Likes: {img.total_likes.toLocaleString()}</p>
                      <p className="text-sm font-bold text-red-500">Like Ratio: {img.like_ratio}%</p>
                    </div>
                  </div>
                ))}
                {leastPerformingImages.length === 0 && <p className="text-slate-500">No least performing images data.</p>}
              </div>
            </div>
          </div>
        ) : (
          !loading && <p className="text-slate-500 bg-white p-6 rounded-lg shadow border">Image performance data is currently unavailable or none found.</p>
        )}
      </section>

      {/* NEW: Average Decision Time Per Style Section */}
      <section>
        <h2 className="text-2xl font-semibold text-slate-700 mb-6">Average Decision Time Per Style</h2>
        {avgTimePerStyle.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-lg shadow-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Style Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Time (seconds)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Timed Swipes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {avgTimePerStyle.map((style) => (
                  <tr key={style.style_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{style.style_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatMsToSeconds(style.avg_time_on_card_ms)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{style.total_timed_swipes_for_style.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
         !loading && <p className="text-slate-500 bg-white p-6 rounded-lg shadow border">Average decision time per style data is currently unavailable.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-700 mb-6">Most Popular Styles (Overall - Top 10 by Likes)</h2>
        {stylePopularity.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-lg shadow-lg border border-slate-200">
            {/* ... existing style popularity table ... */}
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
         !loading && <p className="text-slate-500 bg-white p-6 rounded-lg shadow border">Overall style popularity data is currently unavailable.</p>
        )}
      </section>
    </div>
  );
}