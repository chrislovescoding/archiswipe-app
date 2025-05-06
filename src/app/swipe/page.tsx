// src/app/swipe/page.tsx
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,       // Import forwardRef
  useImperativeHandle // Import useImperativeHandle
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

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------
interface ImageCardData {
  id: number;
  storage_path: string;
  description: string | null;
}

// --- NEW: Define the API that Card component will expose ---
interface CardApi {
  triggerSwipe: (direction: 'left' | 'right') => void;
}

const SWIPE_THRESHOLD = 100;        // Min distance in pixels to trigger swipe
const CARD_FLY_OUT_DURATION = 0.3;  // Animation duration in seconds
const CARD_FETCH_THRESHOLD = 3;     // Fetch when FEWER THAN this many cards are left
const KEY_COOLDOWN_MS = 400;        // Cool-down for keyboard swipes (ms)
const VISIBLE_CARDS = 3;            // How many cards to render in stack
const FETCH_COUNT = 5;              // How many cards to fetch at a time

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function SwipePage() {
  const { session, supabase, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  /* State */
  const [cards, setCards] = useState<ImageCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCards, setOutOfCards] = useState(false); 

  const currentlyProcessingSwipe = useRef(new Set<number>());
  const lastKeyPressTimeRef = useRef(0);
  const isFetchingRef = useRef(false);
  // --- NEW: Ref for the active card's API ---
  const activeCardRef = useRef<CardApi | null>(null);

  /* Auth protection & sign-out */
  useEffect(() => {
    if (!isLoadingAuth && !session) {
      router.replace('/auth');
    }
  }, [isLoadingAuth, session, router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  /* Fetch images */
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
        {
          user_id_param: session.user.id,
          result_limit: count,
        }
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


  /* Swiping Logic (Database & State Update) */
  const completeSwipe = useCallback(
    async (imageId: number, direction: 'left' | 'right') => {
      if (!session?.user?.id || !supabase || currentlyProcessingSwipe.current.has(imageId)) {
        return;
      }
      currentlyProcessingSwipe.current.add(imageId);
      try {
        const { error: swipeError } = await supabase.from('swipes').insert({
          user_id: session.user.id,
          image_id: imageId,
          direction: direction === 'right',
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


  /* Keyboard support */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyPressTimeRef.current < KEY_COOLDOWN_MS) return;
      if (isLoadingAuth || cards.length === 0 || !activeCardRef.current) return;

      lastKeyPressTimeRef.current = now; // Set cooldown immediately

      if (e.key === 'ArrowLeft') {
        activeCardRef.current.triggerSwipe('left'); // Use ref to trigger animation
      }
      if (e.key === 'ArrowRight') {
        activeCardRef.current.triggerSwipe('right'); // Use ref to trigger animation
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLoadingAuth, cards.length]); // activeCardRef.current is not a state/prop, so not needed in deps


  /* Button helpers */
  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (cards.length === 0 || !activeCardRef.current) return;
    activeCardRef.current.triggerSwipe(direction); // Use ref to trigger animation
  };

  /* Render */
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-pink-50 to-white">
        Authenticating...
      </div>
    );
  }
  if (!session || !supabase) return null;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-pink-50 to-white overflow-hidden">
      <DecorativeHearts />
      <header className="relative z-20 w-full">
        <div className="flex justify-between items-center max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-pink-700">ArchiSwipe</Link>
          <nav className="flex items-center space-x-3">
            <Link href="/profile" className="px-4 py-2 bg-pink-100 text-pink-700 border border-pink-200 rounded-full hover:bg-pink-200 font-medium shadow-sm transition">Profile</Link>
            <Link href="/" className="px-4 py-2 bg-pink-100 text-pink-700 border border-pink-200 rounded-full hover:bg-pink-200 font-medium shadow-sm transition">Home</Link>
            <button onClick={handleSignOut} className="px-4 py-2 bg-pink-700 text-white rounded-full hover:bg-pink-800 font-semibold shadow-md transition">Sign Out</button>
          </nav>
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
                // --- NEW: Pass ref only to the active card ---
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
    </main>
  );
}

// -----------------------------------------------------------------------------
// Decorative Hearts Component (Unchanged)
// -----------------------------------------------------------------------------
function DecorativeHearts() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
       <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-pink-200 opacity-20 blur-3xl" />
       <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-300 opacity-20 blur-3xl" />
       <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-pink-400 opacity-10 blur-3xl" />
       <Heart className="top-24 right-12 text-pink-400 opacity-60 text-6xl" />
       <Heart className="top-40 left-16 text-pink-300 opacity-40 text-5xl" />
       <Heart className="bottom-48 right-32 text-pink-400 opacity-50 text-7xl" />
       <Heart className="bottom-1/4 left-1/4 text-pink-500 opacity-30 text-8xl" />
       <Heart className="top-1/2 right-1/3 text-pink-300 opacity-60 text-4xl rotate-12" />
       <Heart className="bottom-36 left-12 text-pink-400 opacity-40 text-5xl -rotate-12" />
       <Heart className="top-32 left-1/3 text-pink-500 opacity-25 text-7xl rotate-45" />
       <Heart className="top-2/3 right-20 text-pink-400 opacity-40 text-6xl -rotate-12" />
     </div>
  );
}
function Heart({ className = '' }: { className?: string }) { return <div className={`absolute ${className}`}>❤️</div>; }

// -----------------------------------------------------------------------------
// Card Component (MODIFIED to use forwardRef and useImperativeHandle)
// -----------------------------------------------------------------------------
interface CardProps {
    cardData: ImageCardData;
    isActive: boolean; 
    visualIndex: number; 
    onSwipeComplete?: (direction: 'left' | 'right') => void; 
    supabase: SupabaseClient;
}
  
// --- NEW: Wrap Card with forwardRef ---
const Card = forwardRef<CardApi, CardProps>(({ // CardApi is the type of the exposed API, CardProps are the props
    cardData,
    isActive,
    visualIndex, 
    onSwipeComplete,
    supabase,
  }, ref) => { // `ref` is the second argument passed by forwardRef
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
  
    // --- Memoize triggerSwipeAnimation as it's used in useImperativeHandle deps ---
    const triggerSwipeAnimation = useCallback((direction: 'left' | 'right') => {
      if (!onSwipeComplete) return; // Should only be callable for active card with onSwipeComplete
      const flyToX = direction === 'left' ? -450 : 450; 
      animate(x, flyToX, { duration: CARD_FLY_OUT_DURATION, ease: 'easeOut' })
        .then(() => {
          requestAnimationFrame(() => onSwipeComplete(direction));
        });
    }, [onSwipeComplete, x]); // x is stable, onSwipeComplete changes with props

    // --- NEW: Expose triggerSwipeAnimation via ref ---
    useImperativeHandle(ref, () => ({
        triggerSwipe: triggerSwipeAnimation
    }), [triggerSwipeAnimation]); // Dependency array for useImperativeHandle
  
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
          x: isActive ? x : 0, 
          rotate: rotate,     
          zIndex,             
          scale: cardVisualScale,              
          y: yOffset,         
          transition: 'scale 0.3s ease-out, y 0.3s ease-out',
        }}
        drag={isActive ? 'x' : false} 
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} 
        onDragEnd={handleDragEnd} 
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {imgUrl ? <img src={imgUrl} alt={cardData.description || 'Architectural image'} className="block w-full h-auto max-h-full pointer-events-none" draggable="false" />
            : <div className="w-full h-full flex items-center justify-center text-gray-400">Loading image...</div> }

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"> {/* Centering Wrapper for Heart */}
            <motion.div style={{ opacity: heartOpacity, scale: heartScale, transformOrigin: 'center center' }} className="p-3 sm:p-4 bg-black/20 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-pink-500/90 rounded-full shadow-2xl border-2 border-pink-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
            </motion.div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"> {/* Centering Wrapper for X */}
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
Card.displayName = 'Card'; // Good practice for forwardRef components for debugging