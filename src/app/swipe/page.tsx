// src/app/swipe/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    motion,
    useMotionValue,
    useTransform,
    animate,
    PanInfo, // Type for drag info
} from 'framer-motion';

// Define the structure of the image card data
interface ImageCardData {
    id: number;
    storage_path: string;
    description: string | null;
}

// Constants for swipe behavior
const SWIPE_THRESHOLD = 100; // Min distance in pixels to trigger swipe
const CARD_FLY_OUT_DURATION = 0.3; // Animation duration in seconds

export default function SwipePage() {
    const { session, supabase, isLoading: isLoadingAuth } = useAuth();
    const router = useRouter();

    const [cards, setCards] = useState<ImageCardData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [outOfCards, setOutOfCards] = useState(false);
    // State to track the index of the card currently on top and interactive
    const [activeIndex, setActiveIndex] = useState(0);

    const currentlyProcessingSwipe = useRef(new Set<number>());

    const lastKeyPressTimeRef = useRef(0); // Add this ref
    const KEY_COOLDOWN_MS = 400; // Cooldown duration in milliseconds (adjust as needed)
    
    // --- Route Protection ---
    useEffect(() => {
        if (!isLoadingAuth && !session) {
            console.log("SwipePage: No session, redirecting...");
            router.replace('/auth');
        }
    }, [isLoadingAuth, session, router]);

    // --- Fetch Images Logic ---
    const fetchImages = useCallback(async (count = 5) => { // Fetch slightly fewer initially maybe
        if (isLoading || outOfCards || !session?.user?.id) return;

        console.log('Fetching images...');
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('get_unseen_images', {
                user_id_param: session.user.id,
                result_limit: count,
            });

            if (rpcError) throw rpcError;

            const newCardsData = data as ImageCardData[] | null;
            console.log('Fetched images data:', newCardsData);

            if (newCardsData && newCardsData.length > 0) {
                setCards(prevCards => {
                    const existingIds = new Set(prevCards.map(c => c.id));
                    const uniqueNewCards = newCardsData.filter(card => !existingIds.has(card.id));
                    // Add new cards to the *beginning* of the array for stacking effect
                    return [...uniqueNewCards, ...prevCards];
                });
                 setActiveIndex(prevIndex => prevIndex + (newCardsData?.length || 0) -1); // Update active index
                 // Reset index after fetching new batch
                 setActiveIndex((newCardsData?.length || 0) - 1);
                setOutOfCards(false);
            } else {
                console.log('No more unseen images found from RPC.');
                if (cards.length === 0) {
                     setOutOfCards(true);
                 }
            }
        } catch (err: any) {
            console.error('Error fetching images:', err);
            setError(err.message || 'Failed to fetch images.');
        } finally {
            setIsLoading(false);
        }
     // Update dependencies to ensure stability
    }, [session, supabase, isLoading, outOfCards, cards.length]); // fetch depends on cards.length to check if truly out


    // --- Initial Image Fetch ---
    useEffect(() => {
        if (session && cards.length === 0 && !isLoading && !outOfCards) {
            console.log("Initial fetch trigger.");
            fetchImages();
        }
    }, [session, cards.length, isLoading, outOfCards, fetchImages]);

     // --- Function to handle the swipe action completion ---
     const completeSwipe = useCallback(async (imageId: number, direction: 'left' | 'right') => {
        console.log(`Completing swipe: ${direction} on image ${imageId}`);
        if (!session?.user?.id || currentlyProcessingSwipe.current.has(imageId)) {
            return; // Already processing or no session
        }

        currentlyProcessingSwipe.current.add(imageId);

        // Update active index to show the next card (or handle outOfCards)
        setActiveIndex(prev => prev - 1);

        // Record swipe in the database
        const swipeDirectionBoolean = direction === 'right';
        try {
            const { error: swipeError } = await supabase
                .from('swipes')
                .insert({
                    user_id: session.user.id,
                    image_id: imageId,
                    direction: swipeDirectionBoolean,
                });

            if (swipeError) {
                 if (swipeError.code === '23505') {
                    console.warn(`Swipe already existed in DB for image ${imageId}.`);
                 } else {
                    throw swipeError;
                 }
            } else {
                console.log(`Swipe recorded in DB: Image ${imageId}, Direction ${direction}`);
            }
        } catch (err: any) {
            console.error('Error recording swipe:', err);
            setError(`Failed to record swipe for image ${imageId}.`);
            // Consider how to handle UI state if DB fails - maybe revert activeIndex?
        } finally {
            currentlyProcessingSwipe.current.delete(imageId);
        }

        // Check if more cards need to be fetched (based on remaining cards *before* UI update)
        const CARD_FETCH_THRESHOLD = 2; // Fetch when 2 or fewer cards are left *underneath*
        if (!isLoading && !outOfCards && activeIndex <= CARD_FETCH_THRESHOLD) { // Check index instead of length
            console.log(`Low on cards (index ${activeIndex}), fetching more...`);
            fetchImages();
        }

     }, [session, supabase, isLoading, outOfCards, activeIndex, fetchImages]); // Include relevant dependencies


    // --- Keyboard Controls (with Timestamp Cooldown) ---
useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        const now = Date.now(); // Get current time

        // --- Timestamp Cooldown Check ---
        // Check if enough time has passed since the last action
        if (now - lastKeyPressTimeRef.current < KEY_COOLDOWN_MS) {
            console.log("Keyboard cooldown active...");
            return; // Exit if cooldown is active
        }
        // --- End Timestamp Cooldown Check ---

        // Ignore keypress if:
        // - Still loading authentication or images
        // - No cards left to swipe (activeIndex is out of bounds)
        // - A swipe animation might be in progress (check !isLoading - covers image fetch loading)
        if (isLoadingAuth || isLoading || activeIndex < 0 || cards.length === 0) {
            console.log("Keyboard ignored due to loading/state.");
            return;
        }

        const topCard = cards[activeIndex];
        if (!topCard) return; // Safety check

        let direction: 'left' | 'right' | null = null;

        if (event.key === 'ArrowLeft') {
            direction = 'left';
        } else if (event.key === 'ArrowRight') {
            direction = 'right';
        }

        if (direction) {
            console.log(`${event.key} pressed, processing action.`);

            // --- Record Action Time ---
            // Update the timestamp *before* triggering the state update
            lastKeyPressTimeRef.current = now;
            // --- End Record Action Time ---

            // *** Improvement still needed: Trigger swipe animation here ***
            // For now, directly call completeSwipe
            completeSwipe(topCard.id, direction);
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function: Only remove the event listener
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        console.log('Removed keydown listener.');
        // No need to clear timeout here anymore
    };
    // Dependencies remain the same as the handler logic still needs them
}, [isLoadingAuth, isLoading, activeIndex, cards, completeSwipe, KEY_COOLDOWN_MS]); // Keep KEY_COOLDOWN_MS if you want changes to it to re-run the effect, otherwise remove it too.

    // --- Rendering Logic ---
    if (isLoadingAuth) {
        return <div className="flex items-center justify-center h-screen">Authenticating...</div>;
    }
    if (!session) return null;

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 overflow-hidden p-4 select-none">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">Swipe Architectural Styles</h1>
            <div className="relative w-[90vw] h-[70vh] max-w-[380px] max-h-[570px]"> {/* Card container */}
                {isLoading && cards.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-10">
                        <p className="text-lg font-semibold">Loading images...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 z-10 p-4 rounded-lg shadow-md">
                        <p>Error: {error}</p>
                    </div>
                )}

                {!isLoading && outOfCards && activeIndex < 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg shadow-md text-center p-4">
                         <p className="text-xl text-gray-600 font-semibold">All Swiped!</p>
                         <p className="text-md text-gray-500 mt-2">You've viewed all available images.</p>
                    </div>
                )}

                 {/* Render the stack of cards */}
                 {cards.map((card, index) => {
                     // Only render the top few cards for performance/visuals
                     if (index > activeIndex || index < activeIndex - 2) { // Render top card + 2 behind
                         return null;
                     }
                     return (
                         <Card
                             key={card.id}
                             cardData={card}
                             isActive={index === activeIndex}
                             onSwipeComplete={(direction) => completeSwipe(card.id, direction)}
                             supabase={supabase} // Pass supabase client
                             isVisible={index >= activeIndex - 2 && index <= activeIndex + 2}
                         />
                     );
                 })}

            </div>
             {/* Optional: Add buttons - these would need to trigger the swipe animation */}
            {/* <div className="mt-4 flex space-x-4 z-20">
                 <button className="p-4 bg-red-500 rounded-full text-white shadow-lg">NOPE</button>
                 <button className="p-4 bg-green-500 rounded-full text-white shadow-lg">LIKE</button>
            </div> */}
        </div>
    );
}


// --- Reusable Card Component (Updated with Memoized URL and Error Handling) ---
interface CardProps {
    cardData: ImageCardData;
    isActive: boolean;
    onSwipeComplete: (direction: 'left' | 'right') => void;
    supabase: SupabaseClient; // Receive Supabase client as prop
    style?: React.CSSProperties;
    isVisible: boolean;
}

const Card: React.FC<CardProps> = ({ cardData, isActive, onSwipeComplete, supabase, style, isVisible }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25], { clamp: false });

    // --- State for Image Loading Error ---
    const [imageError, setImageError] = useState(false);

    // --- Memoize Image URL Generation ---
    // This prevents calling getPublicUrl on every single render
    const imageUrl = useMemo(() => {
        // Reset error state when card data (specifically path) changes
        setImageError(false);
        if (!cardData.storage_path) {
            console.error("Card received without storage_path:", cardData);
            setImageError(true); // Mark as error if path is missing
            return null;
        }
        console.log(`Generating public URL for: ${cardData.storage_path}`);
        try {
            const { data: imageUrlData } = supabase.storage
                .from('house-images') // <-- !!! REPLACE with your actual bucket name !!!
                .getPublicUrl(cardData.storage_path);

            if (!imageUrlData?.publicUrl) {
                 console.warn(`getPublicUrl returned null/undefined for ${cardData.storage_path}`);
                 // Consider setting imageError = true here if null URL is an error condition
            }
            return imageUrlData?.publicUrl ?? null; // Ensure null if undefined
        } catch (e) {
            console.error("Error calling getPublicUrl:", e);
            setImageError(true); // Set error if the sync call itself fails
            return null;
        }
    // Dependency: Recalculate only if storage_path or supabase client changes
    }, [cardData.storage_path, supabase]);


    // --- Image Error Handler ---
    const handleImageError = useCallback(() => {
        // This function is called by the <img> tag's onError event
        console.error(`Failed to load image from src: ${imageUrl} (Path: ${cardData.storage_path})`);
        setImageError(true); // Set state to indicate error
    }, [imageUrl, cardData.storage_path]); // Dependencies for the error handler


    // --- Swipe Animation Trigger ---
    const triggerSwipeAnimation = useCallback((direction: 'left' | 'right') => {
        const flyToX = direction === 'left' ? -450 : 450;
        animate(x, flyToX, { duration: CARD_FLY_OUT_DURATION, ease: "easeOut" })
            .then(() => {
                 requestAnimationFrame(() => {
                    onSwipeComplete(direction);
                 });
            });
    }, [x, onSwipeComplete]);


    // --- Drag End Handler ---
    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;
        if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 200) {
            const direction = offset.x > 0 ? 'right' : 'left';
            triggerSwipeAnimation(direction);
        } else {
            animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
        }
    }, [x, triggerSwipeAnimation]);


    // Don't render if it's already swiped past
    if (!isVisible) return null;

    return (
        <motion.div
            className="absolute w-full h-full rounded-xl shadow-lg overflow-hidden cursor-grab bg-white border border-gray-200"
            style={{
                ...style, // Apply zIndex etc.
                x,
                rotate,
                scale: isActive ? 1 : 0.95,
                y: isActive ? 0 : 10,
                opacity: isActive ? 1 : 1,
                transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            }}
            drag={isActive ? "x" : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={isActive ? handleDragEnd : undefined}
        >
            {/* Image container - Centers content */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Conditional Rendering based on URL and Error State */}
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={cardData.description || 'Architectural image'}
                        className="block w-full h-auto max-h-full pointer-events-none"
                        draggable="false"
                        onError={handleImageError} // Attach the error handler here
                    />
                ) : (
                    // Show specific error or loading state
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-100 p-4 text-center">
                        {imageError ? (
                            <>
                               <p className="text-red-500 font-semibold text-sm">Image Error</p>
                               <p className="text-xs mt-1">Could not load image.</p>
                               {/* Optional: Log path for debugging */}
                               {/* <p className="text-xs mt-1 text-gray-400 break-all">{cardData.storage_path}</p> */}
                            </>
                        ) : (
                            <p>Loading image...</p> // This shows if URL is null/undefined initially
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};