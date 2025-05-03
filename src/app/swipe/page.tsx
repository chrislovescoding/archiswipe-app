// src/app/swipe/page.tsx
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
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

const SWIPE_THRESHOLD = 100;        // Min distance in pixels to trigger swipe
const CARD_FLY_OUT_DURATION = 0.3;  // Animation duration in seconds
const CARD_FETCH_THRESHOLD = 3;     // Fetch when FEWER THAN this many cards are left (e.g., 3 means fetch when length is 2 or 1)
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
  // No longer need activeIndex state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCards, setOutOfCards] = useState(false); // True if backend confirms no more cards

  const currentlyProcessingSwipe = useRef(new Set<number>());
  const lastKeyPressTimeRef = useRef(0);
  const isFetchingRef = useRef(false); // Ref to manage concurrent fetch calls

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
    // Use ref to prevent concurrent fetches
    if (isFetchingRef.current || outOfCards || !session?.user?.id || !supabase) {
        console.log('[Fetch Start] Aborted - isFetching/outOfCards/no session/no supabase');
        return;
    }

    console.log('[Fetch Start]');
    isFetchingRef.current = true; // Set fetching flag
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[Fetch Start] User ID: ${session.user.id}, Count: ${count}`);
      const { data, error: rpcError } = await supabase.rpc(
        'get_unseen_images',
        {
          user_id_param: session.user.id,
          result_limit: count,
        }
      );
      if (rpcError) throw rpcError;

      const newCards = (data || []) as ImageCardData[];
      console.log('[Fetch Received]', newCards);

      if (newCards.length > 0) {
        setCards(prev => {
          console.log(`[Fetch setCards] Previous cards length: ${prev.length}`);
          const existingIds = new Set(prev.map(card => card.id));
          // Filter out any potential duplicates returned by backend (defensive)
          const uniqueNewCards = newCards.filter(card => !existingIds.has(card.id));
          console.log('[Fetch Unique Added]', uniqueNewCards);
          const combined = [...prev, ...uniqueNewCards];
          console.log('[Fetch End] New cards array length:', combined.length);
          return combined;
        });
        // If we received cards, we are definitely not "out of cards" from backend yet
        setOutOfCards(false);
      } else {
        // Backend returned no new cards
        console.log('[Fetch Received] No new cards received from backend.');
        // Set outOfCards to true ONLY if the state is also currently empty
        // This prevents setting it true if we just haven't fetched *more* yet
        setCards(prev => {
            if (prev.length === 0) {
                console.log('[Fetch Received] Setting outOfCards = true (no new cards AND state is empty)');
                setOutOfCards(true);
            }
            return prev; // No change to cards state if fetch returned empty
        });
      }
    } catch (err: any) {
      console.error('[Fetch Error]', err);
      setError(err.message || 'Failed to fetch images.');
    } finally {
      console.log('[Fetch Finish] Setting isLoading=false');
      setIsLoading(false);
      isFetchingRef.current = false; // Reset fetching flag
    }
  }, [outOfCards, session, supabase]); // Removed isLoading from deps, use ref instead


  // Initial fetch
  useEffect(() => {
    // Fetch only if authenticated, not loading, cards are empty, and we haven't confirmed we're out
    if (session && supabase && !isFetchingRef.current && cards.length === 0 && !outOfCards) {
        console.log("[Initial Fetch Effect] Triggering initial fetch.");
        fetchImages();
    }
  }, [session, supabase, cards.length, outOfCards, fetchImages]); // Add supabase dependency


  // Prefetch images when card count gets low
   useEffect(() => {
      // Check if cards exist, not loading, not out, and below threshold
      // Use < threshold because we want to fetch when e.g. 2 cards are left if threshold is 3
      if (!isFetchingRef.current && !outOfCards && cards.length > 0 && cards.length < CARD_FETCH_THRESHOLD) {
          console.log(`[Prefetch Effect Triggered] Length ${cards.length} is below threshold ${CARD_FETCH_THRESHOLD}. Calling fetchImages.`);
          fetchImages();
      }
  }, [cards.length, outOfCards, fetchImages]); // Removed isLoading dependency


  /* Swiping */
  const completeSwipe = useCallback(
    async (imageId: number, direction: 'left' | 'right') => {
      console.log(`[Swipe Start Attempt] ID: ${imageId}, Direction: ${direction}`);
      if (!session?.user?.id || !supabase || currentlyProcessingSwipe.current.has(imageId)) {
        console.warn(`[Swipe Start Aborted] ID: ${imageId}. Reason: No session/supabase or already processing.`);
        return;
      }
      console.log(`[Swipe Start Processing] ID: ${imageId}. Adding to processing set.`);
      currentlyProcessingSwipe.current.add(imageId);

      try {
        console.log(`[Swipe DB Write Start] ID: ${imageId}`);
        const { error: swipeError } = await supabase.from('swipes').insert({
          user_id: session.user.id,
          image_id: imageId,
          direction: direction === 'right',
        });

        if (swipeError) {
            // Log conflict errors specifically but don't throw, allow UI to proceed
            if (swipeError.code === '23505') { // Postgres unique violation code
                 console.warn(`[Swipe DB Write Conflict] ID: ${imageId}. Card likely already swiped.`);
            } else {
                throw swipeError; // Throw other DB errors
            }
        } else {
            console.log(`[Swipe DB Write Success] ID: ${imageId}`);
        }

        // Optimistically remove card from UI state *after* DB attempt starts
        // (or after success if preferred, but this feels faster)
        setCards(prev => {
            if (prev.length > 0 && prev[0].id === imageId) {
                const newCardsState = prev.slice(1);
                console.log(`[Swipe UI Update] Removed card ${imageId}. New array length: ${newCardsState.length}`);
                return newCardsState;
            }
            // If top card ID doesn't match (e.g., rapid swipes), don't change state here
            console.warn(`[Swipe UI Update] Top card ID (${prev[0]?.id}) did not match swiped ID (${imageId}). State not changed by this swipe.`);
            return prev;
        });

      } catch (err) {
        // Catch errors other than conflicts if they were thrown
        console.error(`[Swipe Error] ID: ${imageId}`, err);
        // Optionally: Add the card back? Revert UI? Depends on desired UX.
        // For now, we proceed optimistically.
      } finally {
        console.log(`[Swipe Finish Processing] ID: ${imageId}. Removing from processing set.`);
        currentlyProcessingSwipe.current.delete(imageId);
      }
    },
    [session, supabase] // Removed fetch-related dependencies
  );


  /* Keyboard support */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyPressTimeRef.current < KEY_COOLDOWN_MS) return;
      // Check if loading auth OR if cards array is empty
      if (isLoadingAuth || cards.length === 0) return;

      const topCard = cards[0]; // Always target the first card
      if (!topCard) return; // Should not happen if cards.length > 0, but good check

      if (e.key === 'ArrowLeft') {
        lastKeyPressTimeRef.current = now;
        completeSwipe(topCard.id, 'left');
      }
      if (e.key === 'ArrowRight') {
        lastKeyPressTimeRef.current = now;
        completeSwipe(topCard.id, 'right');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isLoadingAuth,
    cards, // Depend on cards array itself
    completeSwipe,
  ]);

  /* Button helpers */
  const handleButtonSwipe = (direction: 'left' | 'right') => {
     // Check if cards array is empty
    if (cards.length === 0) return;
    const topCard = cards[0]; // Always target the first card
    if (topCard) {
        completeSwipe(topCard.id, direction);
    }
  };

  /* Render */
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-pink-50 to-white">
        Authenticating...
      </div>
    );
  }
  // Don't render anything until session is confirmed (prevents flicker)
  if (!session || !supabase) return null;

  const currentTopCard = cards[0]; // Get the card potentially being swiped

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-pink-50 to-white overflow-hidden">
      <DecorativeHearts />

      <header className="relative z-20 w-full">
        <div className="flex justify-between items-center max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-pink-700">
            ArchiSwipe
          </Link>
          <nav className="flex items-center space-x-3">
            <Link
              href="/profile"
              className="px-4 py-2 bg-pink-100 text-pink-700 border border-pink-200 rounded-full hover:bg-pink-200 font-medium shadow-sm transition duration-300"
            >
              Profile
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-pink-100 text-pink-700 border border-pink-200 rounded-full hover:bg-pink-200 font-medium shadow-sm transition duration-300"
            >
              Home
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-pink-700 text-white rounded-full hover:bg-pink-800 font-semibold shadow-md transition duration-300"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <section className="relative z-10 flex flex-col items-center justify-center pt-8 pb-28 px-4 select-none">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
          Swipe Architectural Styles
        </h1>
        <div className="relative w-[90vw] h-[70vh] max-w-[380px] max-h-[570px]">
          {/* Loading state: show only if cards are empty AND isLoading is true */}
          {isLoading && cards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 rounded-lg z-10">
              <p className="text-lg font-semibold">Loading images...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 p-4 rounded-lg z-10">
              Error: {error}
            </div>
          )}

          {/* Out of Cards state: show only if confirmed outOfCards AND cards are empty */}
          {outOfCards && cards.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-4 text-center">
              <p className="text-xl font-semibold text-gray-600">
                All Swiped!
              </p>
              <p className="text-md text-gray-500 mt-2">
                You've viewed all available images.
              </p>
            </div>
          )}

          {/* Render cards stack */}
          {/* Slice off the visible cards and reverse for stacking order (index 0 = bottom) */}
          {cards.slice(0, VISIBLE_CARDS).reverse().map((card, indexInReversedStack) => {
            // Calculate index relative to the *top* of the stack (0 = top, 1 = next down...)
             const index = VISIBLE_CARDS - 1 - indexInReversedStack;

            // Determine if this card is the active (topmost) one
             const isActive = index === 0;

            return (
              <Card
                key={card.id}
                cardData={card}
                isActive={isActive} // Is it the top card?
                visualIndex={index} // Its position in the visual stack (0=top)
                // Only the top card actually triggers the swipe action
                onSwipeComplete={direction => isActive ? completeSwipe(card.id, direction) : undefined}
                supabase={supabase}
              />
            );
          })}
        </div>

        <div className="flex space-x-8 mt-8">
          <button
            aria-label="Nope"
            onClick={() => handleButtonSwipe('left')}
            disabled={cards.length === 0} // Disable buttons if no cards
            className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            aria-label="Like"
            onClick={() => handleButtonSwipe('right')}
            disabled={cards.length === 0} // Disable buttons if no cards
            className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
        </div>
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Decorative Hearts Component (Keep As Is)
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

function Heart({ className = '' }: { className?: string }) {
  return <div className={`absolute ${className}`}>❤️</div>;
}

// -----------------------------------------------------------------------------
// Card Component (Corrected Hooks Order)
// -----------------------------------------------------------------------------
interface CardProps {
    cardData: ImageCardData;
    isActive: boolean; // Is this the top, interactive card?
    visualIndex: number; // Position in the visual stack (0 = top)
    onSwipeComplete?: (direction: 'left' | 'right') => void; // Make optional, only top card uses it
    supabase: SupabaseClient;
  }
  
  const Card: React.FC<CardProps> = ({
    cardData,
    isActive,
    visualIndex, // Receive visual index
    onSwipeComplete,
    supabase,
  }) => {
    // --- HOOKS (Called Unconditionally) ---
    const x = useMotionValue(0); // Motion value for horizontal drag
    const rotate = useTransform( // Calculate rotation based on x - ALWAYS CALLED
      x,
      [-200, 0, 200], // Input range (pixels dragged)
      [-25, 0, 25],   // Output range (degrees rotated)
      { clamp: false } // Allow rotation beyond the specified range if needed
    );
  
    // --- Style Calculations ---
    // Calculate dynamic styles based on stack position
    const scale = isActive ? 1 : Math.max(0, 1 - (visualIndex * 0.05)); // Top card scale 1, others smaller
    const yOffset = isActive ? 0 : visualIndex * 10; // Top card y 0, others offset down
    const zIndex = VISIBLE_CARDS - visualIndex; // Top card highest zIndex
  
    // --- Image URL ---
    // Generate public URL
     const rawStoragePath = decodeURIComponent(cardData.storage_path);
     const { data: urlData } = supabase.storage
     .from('house-images')
     .getPublicUrl(rawStoragePath);
     const imgUrl = urlData?.publicUrl;
  
    // --- Event Handlers ---
    // Function to trigger the fly-out animation and call the callback
    const triggerSwipeAnimation = (direction: 'left' | 'right') => {
      // Ensure callback exists (it only does for the active card)
      if (!onSwipeComplete) return;
  
      const flyToX = direction === 'left' ? -450 : 450; // Target x position off-screen
      // Animate the x value
      animate(x, flyToX, {
        duration: CARD_FLY_OUT_DURATION,
        ease: 'easeOut',
      }).then(() => {
        // After animation completes, call the swipe complete callback
        // Use requestAnimationFrame to ensure it runs smoothly after the animation frame
        requestAnimationFrame(() =>
          onSwipeComplete(direction)
        );
      });
    };
  
    // Function to handle the end of a drag gesture
    const handleDragEnd = (
      _: MouseEvent | TouchEvent | PointerEvent, // Event object (ignored)
      info: PanInfo // Information about the drag gesture
    ) => {
      // Drag end only relevant for the active card
      if (!isActive) return;
  
      const { offset, velocity } = info; // Get distance dragged and velocity
      // Determine if swipe threshold was met (distance or velocity)
      if (
        Math.abs(offset.x) > SWIPE_THRESHOLD ||
        Math.abs(velocity.x) > 200 // Check velocity for quick flicks
      ) {
        // Trigger swipe animation based on drag direction
        const direction = offset.x > 0 ? 'right' : 'left';
        triggerSwipeAnimation(direction);
      } else {
        // If threshold not met, animate back to center
        animate(x, 0, {
          type: 'spring', // Use spring physics for a natural feel
          stiffness: 300,
          damping: 30,
        });
      }
    };
  
    // --- Render ---
    return (
      <motion.div
        className="absolute w-full h-full rounded-xl shadow-lg overflow-hidden cursor-grab bg-white border border-gray-200"
        style={{
          x: isActive ? x : 0, // Only apply the drag offset (x) to the active card
          rotate: rotate,     // Apply the rotation calculated by useTransform (will be 0 for non-active cards if x=0)
          zIndex,             // Apply calculated z-index for stacking
          scale,              // Apply calculated scale for depth effect
          y: yOffset,         // Apply calculated y-offset for stacking
          // Apply CSS transition for smooth visual updates when stack position changes (scale/y)
          // Note: x/rotate transitions are handled by framer-motion's animate/drag
          transition: 'scale 0.3s ease-out, y 0.3s ease-out',
        }}
        drag={isActive ? 'x' : false} // Only the top card (isActive=true) is draggable horizontally
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Constrain drag within parent bounds (optional)
        onDragEnd={handleDragEnd} // Attach drag end handler
      >
        {/* Image Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          {imgUrl ? (
            <>
              <img
                src={imgUrl}
                alt={cardData.description || 'Architectural image'}
                className="block w-full h-auto max-h-full pointer-events-none" // Prevent image interaction
                draggable="false" // Prevent native image dragging
              />
            </>
          ) : (
            // Fallback / Loading state if image URL isn't ready
            <>
              {console.warn(`[Card] No image URL found for card ${cardData.id}`)}
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Loading image...
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  };