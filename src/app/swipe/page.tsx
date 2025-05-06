// src/app/swipe/page.tsx
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,       
  useImperativeHandle 
} from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  PanInfo,
} from 'framer-motion';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Users as UsersIcon, Compass as CompassIcon, Home as HomeIconLucide } from 'lucide-react'; // Added HomeIconLucide

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------
interface ImageCardData {
  id: number;
  storage_path: string;
  description: string | null;
}

interface CardApi {
  triggerSwipe: (direction: 'left' | 'right') => void;
}

const SWIPE_THRESHOLD = 100;        
const CARD_FLY_OUT_DURATION = 0.3;  
const CARD_FETCH_THRESHOLD = 3;     
const KEY_COOLDOWN_MS = 400;        
const VISIBLE_CARDS = 3;            
const FETCH_COUNT = 5;              

// --- Simple Heart component for background decoration (copied from page.tsx) ---
const HeartBG = ({ className = '' }: { className?: string }) => ( // Renamed to HeartBG to avoid conflict with lucide-react Heart
  <div className={`absolute text-[rgb(var(--primary-rgb))] ${className}`}>❤️</div>
);


// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function SwipePage() {
  const { session, supabase, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const [cards, setCards] = useState<ImageCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCards, setOutOfCards] = useState(false); 

  const currentlyProcessingSwipe = useRef(new Set<number>());
  const lastKeyPressTimeRef = useRef(0);
  const isFetchingRef = useRef(false);
  const activeCardRef = useRef<CardApi | null>(null);

  // --- Nav Link Styles (copied from page.tsx for consistency) ---
  const navLinkBase = "px-4 py-2 rounded-full font-medium smooth-transition text-sm shadow-sm hover:shadow-md";
  const navLinkSecondary = `${navLinkBase} bg-white text-[rgb(var(--primary-text-soft-rgb))] border border-[rgba(var(--primary-light-rgb),0.5)] hover:bg-[rgba(var(--primary-light-rgb),0.2)]`;
  const navLinkPrimary = `${navLinkBase} bg-[rgb(var(--primary-rgb))] text-white hover:bg-[rgb(var(--primary-hover-rgb))]`;


  useEffect(() => {
    if (!isLoadingAuth && !session) {
      router.replace('/auth');
    }
  }, [isLoadingAuth, session, router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // router.replace('/auth'); // AuthContext will handle redirect via useEffect listener
  };

  const fetchImages = useCallback(async (count = FETCH_COUNT) => {
    if (isFetchingRef.current || outOfCards || !session?.user?.id || !supabase) {
        return;
    }
    isFetchingRef.current = true; 
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_unseen_images',
        { user_id_param: session.user.id, result_limit: count, }
      );
      if (rpcError) throw rpcError;
      const newCards = (data || []) as ImageCardData[];
      if (newCards.length > 0) {
        setCards(prev => {
          const existingIds = new Set(prev.map(card => card.id));
          const uniqueNewCards = newCards.filter(card => !existingIds.has(card.id));
          return [...prev, ...uniqueNewCards];
        });
        setOutOfCards(false);
      } else {
        setCards(prev => {
            if (prev.length === 0) setOutOfCards(true);
            return prev; 
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch images.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false; 
    }
  }, [outOfCards, session, supabase]); 


  useEffect(() => {
    if (session && supabase && !isFetchingRef.current && cards.length === 0 && !outOfCards) {
        fetchImages();
    }
  }, [session, supabase, cards.length, outOfCards, fetchImages]); 


   useEffect(() => {
      if (!isFetchingRef.current && !outOfCards && cards.length > 0 && cards.length < CARD_FETCH_THRESHOLD) {
          fetchImages();
      }
  }, [cards.length, outOfCards, fetchImages]); 


  const completeSwipe = useCallback(
    async (imageId: number, direction: 'left' | 'right') => {
      if (!session?.user?.id || !supabase || currentlyProcessingSwipe.current.has(imageId)) {
        return;
      }
      currentlyProcessingSwipe.current.add(imageId);
      try {
        const { error: swipeError } = await supabase.from('swipes').insert({
          user_id: session.user.id, image_id: imageId, direction: direction === 'right',
        });
        if (swipeError && swipeError.code !== '23505') { 
            throw swipeError; 
        }
        setCards(prev => {
            if (prev.length > 0 && prev[0].id === imageId) {
                return prev.slice(1);
            }
            return prev;
        });
      } catch (err) {
        console.error(`[Swipe Error] ID: ${imageId}`, err);
      } finally {
        currentlyProcessingSwipe.current.delete(imageId);
      }
    },
    [session, supabase] 
  );


  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyPressTimeRef.current < KEY_COOLDOWN_MS) return;
      if (isLoadingAuth || cards.length === 0 || !activeCardRef.current) return;
      lastKeyPressTimeRef.current = now; 
      if (e.key === 'ArrowLeft') activeCardRef.current.triggerSwipe('left');
      if (e.key === 'ArrowRight') activeCardRef.current.triggerSwipe('right');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLoadingAuth, cards.length]); 


  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (cards.length === 0 || !activeCardRef.current) return;
    activeCardRef.current.triggerSwipe(direction);
  };


  if (isLoadingAuth) {
    return ( // Using the same loading screen as profile page for consistency
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Authenticating...</div>
             <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }
  if (!session || !supabase) return null;

  // --- MODIFIED: Replaced main tag class and added decorative elements ---
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 text-slate-700 overflow-hidden"> {/* Added overflow-hidden to main for swipe page */}
      {/* Decorative elements from page.tsx */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-80">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-pink-200/30 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-rose-300/30 blur-3xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-fuchsia-400/20 blur-3xl animate-pulse-slow animation-delay-4000"></div>
        <HeartBG className="top-16 left-1/4 text-6xl opacity-20 -rotate-12 animate-pulse-slow animation-delay-2000" />
        <HeartBG className="top-1/3 right-12 text-8xl opacity-15 rotate-[25deg] animate-pulse-slow" />
        <HeartBG className="top-3/4 left-10 text-5xl opacity-25 rotate-6 animate-pulse-slow animation-delay-4000" />
        {/* Removed some of the page.tsx specific hearts if they were too much for swipe page, can add back if desired */}
      </div>

      {/* MODIFIED Header to match page.tsx style */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-3xl font-bold text-[rgb(var(--primary-rgb))]">ArchiSwipe</Link>
            <nav className="flex space-x-3 items-center">
              <Link href="/profile" className={navLinkSecondary}>
                <UsersIcon size={18} className="inline mr-1" /> Profile
              </Link>
              <Link href="/" className={navLinkSecondary}>
                <HomeIconLucide size={18} className="inline mr-1" /> Home
              </Link>
              <button onClick={handleSignOut} className={navLinkPrimary}>Sign Out</button>
            </nav>
          </div>
        </div>
      </header>

      <section className="relative z-10 flex flex-col items-center justify-center pt-8 pb-28 px-4 select-none">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">Swipe Architectural Styles</h1>
        <div className="relative w-[90vw] h-[70vh] max-w-[380px] max-h-[570px]">
          {isLoading && cards.length === 0 && ( <div className="absolute inset-0 flex items-center justify-center bg-white/75 rounded-lg z-10"><p className="text-lg font-semibold">Loading images...</p></div> )}
          {error && ( <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 p-4 rounded-lg z-10">Error: {error}</div> )}
          {outOfCards && cards.length === 0 && !isLoading && ( <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-4 text-center"><p className="text-xl font-semibold text-gray-600">All Swiped!</p><p className="text-md text-gray-500 mt-2">You've viewed all available images.</p></div> )}

          {cards.slice(0, VISIBLE_CARDS).reverse().map((card, indexInReversedStack) => {
             const index = VISIBLE_CARDS - 1 - indexInReversedStack;
             const isActive = index === 0;
            return (
              <Card
                key={card.id}
                ref={isActive ? activeCardRef : null} 
                cardData={card}
                isActive={isActive} 
                visualIndex={index} 
                onSwipeComplete={direction => isActive ? completeSwipe(card.id, direction) : undefined}
                supabase={supabase}
              />
            );
          })}
        </div>

        <div className="flex space-x-8 mt-8">
          <button aria-label="Nope" onClick={() => handleButtonSwipe('left')} disabled={cards.length === 0} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button aria-label="Like" onClick={() => handleButtonSwipe('right')} disabled={cards.length === 0} className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </button>
        </div>
      </section>

      {/* MODIFIED: Footer from page.tsx */}
       <footer className="py-12 bg-slate-900 text-slate-400 relative z-10 mt-12">
         <div className="container mx-auto px-4 text-center">
           <div className="text-3xl font-bold text-[rgb(var(--primary-rgb))] mb-4">ArchiSwipe</div>
           <p className="mb-2">© {new Date().getFullYear()} ArchiSwipe - Swipe your way to architectural enlightenment.</p> {/* Different witty remark */}
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

// -----------------------------------------------------------------------------
// Card Component (Unchanged from previous version - for brevity, not repeated fully)
// -----------------------------------------------------------------------------
interface CardProps {
    cardData: ImageCardData;
    isActive: boolean; 
    visualIndex: number; 
    onSwipeComplete?: (direction: 'left' | 'right') => void; 
    supabase: SupabaseClient;
}
  
const Card = forwardRef<CardApi, CardProps>(({ 
    cardData, isActive, visualIndex, onSwipeComplete, supabase,
  }, ref) => { 
    const x = useMotionValue(0); 
    const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25], { clamp: false });
    const heartOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD], [0, 0.6, 1]);
    const heartScale = useTransform(x, [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD], [0.3, 0.8, 1]);
    const xOpacity = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.3, 0], [1, 0.6, 0]);
    const xScale = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.3, 0], [1, 0.8, 0.3]);
    const cardVisualScale = isActive ? 1 : Math.max(0, 1 - (visualIndex * 0.05)); 
    const yOffset = isActive ? 0 : visualIndex * 10; 
    const zIndex = VISIBLE_CARDS - visualIndex; 
    const rawStoragePath = decodeURIComponent(cardData.storage_path);
    const { data: urlData } = supabase.storage.from('house-images').getPublicUrl(rawStoragePath);
    const imgUrl = urlData?.publicUrl;
  
    const triggerSwipeAnimation = useCallback((direction: 'left' | 'right') => {
      if (!onSwipeComplete) return;
      const flyToX = direction === 'left' ? -450 : 450; 
      animate(x, flyToX, { duration: CARD_FLY_OUT_DURATION, ease: 'easeOut' })
        .then(() => {
          requestAnimationFrame(() => onSwipeComplete(direction));
        });
    }, [onSwipeComplete, x]); 

    useImperativeHandle(ref, () => ({
        triggerSwipe: triggerSwipeAnimation
    }), [triggerSwipeAnimation]); 
  
    const handleDragEnd = (_: any, info: PanInfo) => {
      if (!isActive) return;
      const { offset, velocity } = info; 
      if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 200 ) {
        triggerSwipeAnimation(offset.x > 0 ? 'right' : 'left');
      } else {
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    };
  
    return (
      <motion.div
        className="absolute w-full h-full rounded-xl shadow-lg overflow-hidden cursor-grab bg-white border border-gray-200"
        style={{
          x: isActive ? x : 0, rotate: rotate, zIndex,             
          scale: cardVisualScale, y: yOffset,         
          transition: 'scale 0.3s ease-out, y 0.3s ease-out',
        }}
        drag={isActive ? 'x' : false} 
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} 
        onDragEnd={handleDragEnd} 
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {imgUrl ? <img src={imgUrl} alt={cardData.description || 'Architectural image'} className="block w-full h-auto max-h-full pointer-events-none" draggable="false" />
            : <div className="w-full h-full flex items-center justify-center text-gray-400">Loading image...</div> }
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <motion.div style={{ opacity: heartOpacity, scale: heartScale, transformOrigin: 'center center' }} className="p-3 sm:p-4 bg-black/20 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-pink-500/90 rounded-full shadow-2xl border-2 border-pink-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
            </motion.div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <motion.div style={{ opacity: xOpacity, scale: xScale, transformOrigin: 'center center' }} className="p-3 sm:p-4 bg-black/20 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-red-500/90 rounded-full shadow-2xl border-2 border-red-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  });
Card.displayName = 'Card'; 