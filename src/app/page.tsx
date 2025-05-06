// src/app/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
  Heart as HeartIconLucide,
  Home as HomeIcon,
  Compass,
  Users,
  CheckCircle,
  BarChart2,
  Star,
  X as XIcon,
} from 'lucide-react';

// --- Constants for Mockup Images ---
const MOCKUP_IMAGE_URL_TOP = "https://waunizuiwfmcuxnlrncs.supabase.co/storage/v1/object/public/house-images/mockup-assets/stylised-building-1.png";
const MOCKUP_IMAGE_URL_BOTTOM = "https://waunizuiwfmcuxnlrncs.supabase.co/storage/v1/object/public/house-images/mockup-assets/stylised-building-2.png";

// --- Updated MockupCard Component ---
const MockupCard = ({
  imageUrl,
  isTopCard = false,
  showLikeOverlay = false,
  zIndex,
}: {
  imageUrl: string;
  isTopCard?: boolean;
  showLikeOverlay?: boolean;
  zIndex: number;
}) => {
  const cardShellStyle = `absolute left-1/2 top-1/2 
                         w-[85%] aspect-[9/14] 
                         rounded-xl shadow-lg overflow-hidden 
                         bg-white border border-gray-200`; 

  const baseScale = 0.97; 
  const transformEffect = isTopCard
    ? { transform: `translateX(65px) translateY(-5px) rotate(12deg) translateZ(0px) scale(${baseScale})` } 
    : { transform: `translateX(0px) translateY(5px) rotate(0deg) translateZ(0px) scale(${baseScale})` };

  return (
    <div
      className={cardShellStyle}
      style={{
        transform: `translate(-50%, -50%) ${transformEffect.transform}`,
        zIndex,
        WebkitTransform: `translate(-50%, -50%) ${transformEffect.transform}`,
      }}
    >
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt="Architectural mockup"
          className="block w-full h-auto max-h-full pointer-events-none"
          draggable="false"
        />
      </div>
      {showLikeOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"> 
          <div className="p-3 bg-black/20 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 flex items-center justify-center bg-pink-500/90 rounded-full shadow-2xl border-2 border-pink-300">
              <HeartIconLucide className="h-8 w-8 text-white" fill="currentColor" strokeWidth={2} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Simple Heart component for background decoration
const Heart = ({ className = '' }: { className?: string }) => (
  <div className={`absolute text-[rgb(var(--primary-rgb))] ${className}`}>❤️</div>
);

// Helper component for feature cards
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl smooth-transition border border-[rgb(var(--card-border-rgb))]">
    <div className="mb-4 p-4 bg-[rgba(var(--primary-light-rgb),0.4)] rounded-full text-[rgb(var(--primary-rgb))]">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-slate-700">{title}</h3>
    <p className="text-[rgb(var(--text-muted-rgb))] text-sm leading-relaxed">{description}</p>
  </div>
);

// Helper component for testimonial cards
const TestimonialCard = ({ avatarInitials, name, role, quote }: { avatarInitials: string, name: string, role: string, quote: string }) => (
  <div className="bg-white p-8 rounded-xl shadow-lg border border-[rgb(var(--card-border-rgb))] relative">
    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 bg-[rgb(var(--primary-rgb))] text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
      “
    </div>
    <div className="flex items-center mb-6 mt-6">
      <div className="w-14 h-14 bg-[rgba(var(--primary-light-rgb),0.4)] rounded-full mr-4 flex items-center justify-center text-[rgb(var(--primary-rgb))] font-bold text-xl">
        {avatarInitials}
      </div>
      <div>
        <h4 className="font-semibold text-slate-800">{name}</h4>
        <p className="text-[rgb(var(--text-muted-rgb))] text-sm">{role}</p>
      </div>
    </div>
    <p className="text-slate-600 italic leading-relaxed text-md">"{quote}"</p>
  </div>
);


export default function Home() {
  const router = useRouter();
  const { session, isLoading: isLoadingAuth } = useAuth();

  const navLinkBase = "px-4 py-2 rounded-full font-medium smooth-transition text-sm shadow-sm hover:shadow-md";
  const navLinkSecondary = `${navLinkBase} bg-white text-[rgb(var(--primary-text-soft-rgb))] border border-[rgba(var(--primary-light-rgb),0.5)] hover:bg-[rgba(var(--primary-light-rgb),0.2)]`;
  const navLinkPrimary = `${navLinkBase} bg-[rgb(var(--primary-rgb))] text-white hover:bg-[rgb(var(--primary-hover-rgb))]`;

  const mainButtonClass = "px-8 py-3 bg-[rgb(var(--primary-rgb))] text-white rounded-full hover:bg-[rgb(var(--primary-hover-rgb))] font-semibold shadow-lg text-lg smooth-transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary-rgb))] flex items-center justify-center space-x-2";

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (delay: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay }
    })
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 text-slate-700">
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

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-3xl font-bold text-[rgb(var(--primary-rgb))]">
              ArchiSwipe
            </Link>
            <nav className="flex space-x-3 items-center">
              {isLoadingAuth ? (
                <div className="h-9 w-24 bg-gray-200 rounded-full animate-pulse"></div>
              ) : session ? (
                <Link href="/profile" className={navLinkSecondary}>
                  <Users size={18} className="inline mr-1" /> Profile
                </Link>
              ) : (
                <Link href="/auth" className={navLinkSecondary}>
                  Login / Sign Up
                </Link>
              )}
              <Link href="/swipe" className={navLinkPrimary}>
                Start Swiping <Compass size={18} className="inline ml-1" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="relative py-20 md:py-32 text-center px-4 z-10 overflow-hidden">
        <div className="container mx-auto">
          <motion.h1
            variants={fadeIn} initial="hidden" animate="visible" custom={0}
            className="text-5xl md:text-7xl font-extrabold mb-6 text-[rgb(var(--primary-rgb))]"
          >
            Swipe Right on Architecture
          </motion.h1>
          <motion.p
             variants={fadeIn} initial="hidden" animate="visible" custom={0.2}
            className="text-xl md:text-2xl text-slate-700 mb-10 max-w-2xl mx-auto"
          >
            Because relationships end, but Gothic columns are forever. Find your structural soulmate.
          </motion.p>

          <motion.div
            variants={fadeIn} initial="hidden" animate="visible" custom={0.4}
            className="flex justify-center"
          >
            <button onClick={() => router.push('/swipe')} className={mainButtonClass}>
              <span>Discover Your Style</span>
              <Compass size={22} />
            </button>
          </motion.div>

           {/* --- Phone Mockup --- */}
           <motion.div
            variants={fadeIn} initial="hidden" animate="visible" custom={0.6}
            className="relative max-w-xs w-full mx-auto mt-16 md:mt-24 group"
            >
             <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-3xl blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
             <div className="relative rounded-[36px] overflow-hidden border-4 border-slate-900 shadow-2xl bg-slate-900 p-1.5">
               <div className="aspect-[9/16] bg-white rounded-[28px] relative overflow-hidden flex flex-col">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-900 rounded-b-lg z-30"></div>
                 <div className="relative flex-grow flex items-center justify-center pt-5 pb-2 mt-3">
                   <MockupCard
                     imageUrl={MOCKUP_IMAGE_URL_BOTTOM}
                     zIndex={5}
                   />
                   <MockupCard
                     imageUrl={MOCKUP_IMAGE_URL_TOP}
                     isTopCard={true}
                     showLikeOverlay={true}
                     zIndex={10}
                   />
                 </div>
                 {/* MODIFIED Action Buttons Area */}
                 <div className="p-4 bg-white border-t border-gray-100 z-20 shrink-0">
                   <div className="flex justify-center space-x-8">
                      <button 
                        aria-label="Nope" 
                        className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                      >
                        <XIcon size={28} strokeWidth={2}/> {/* Adjusted size/stroke for consistency with image */}
                      </button>
                      <button 
                        aria-label="Like" 
                        className="w-14 h-14 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                      >
                        {/* HeartIconLucide size 28, strokeWidth 2, NO fill makes it an outline */}
                        <HeartIconLucide size={28} strokeWidth={2} /> 
                      </button>
                   </div>
                 </div>
               </div>
             </div>
           </motion.div>
           {/* --- End Phone Mockup --- */}
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white/70 backdrop-blur-sm relative z-10">
       <div className="container mx-auto px-4">
         <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
          className="text-3xl md:text-4xl font-bold text-center mb-6 text-slate-800">Find Your Perfect Architectural Match</motion.h2>
         <motion.p variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2}
          className="text-center text-[rgb(var(--primary-rgb))] mb-12 md:mb-16 text-lg italic">Form follows function, but love follows swipes.</motion.p>
         <div className="grid md:grid-cols-3 gap-8">
           <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.3}>
            <FeatureCard icon={<Compass size={32}/>} title="Swipe on Styles" description="Tired of boring buildings? Swipe right on the facades that make your heart flutter."/>
           </motion.div>
           <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.4}>
            <FeatureCard icon={<CheckCircle size={32}/>} title="Match with Masterpieces" description="Georgian, Neoclassical, or Mid-Century Modern - we won't judge your type."/>
           </motion.div>
           <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.5}>
            <FeatureCard icon={<Users size={32}/>} title="Architectural Matchmaking" description="Our algorithm helps you discover buildings that resonate with your unique taste."/>
           </motion.div>
         </div>
       </div>
     </section>

      <section className="py-12 md:py-16 bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white relative z-10">
       <div className="container mx-auto px-4">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
           {[
             { icon: <BarChart2 size={32} className="mx-auto mb-2 opacity-80"/>, value: "5M+", label: "Daily Swipes" },
             { icon: <HomeIcon size={32} className="mx-auto mb-2 opacity-80"/>, value: "22+", label: "Architectural Styles" },
             { icon: <HeartIconLucide size={32} className="mx-auto mb-2 opacity-80"/>, value: "92%", label: "Match Success" },
             { icon: <Star size={32} className="mx-auto mb-2 opacity-80"/>, value: "4.8★", label: "User Rating" }
           ].map((stat, index) => (
             <motion.div key={stat.label} variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={index * 0.1}>
               {stat.icon}
               <p className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</p>
               <p className="text-sm uppercase tracking-wider opacity-90">{stat.label}</p>
             </motion.div>
           ))}
         </div>
       </div>
     </section>

      <section className="py-16 md:py-24 bg-pink-50 relative z-10">
       <div className="container mx-auto px-4">
         <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
          className="text-3xl md:text-4xl font-bold text-center mb-6 text-slate-800">What Our Users Say</motion.h2>
         <motion.p variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2}
          className="text-center text-[rgb(var(--primary-rgb))] mb-12 md:mb-16 text-lg italic">Real reviews from real architecture enthusiasts</motion.p>
         <div className="grid md:grid-cols-2 gap-8 md:gap-12">
           <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.3}>
            <TestimonialCard avatarInitials="M" name="Margaret, 34" role="Architecture Professor" quote="Before ArchiSwipe, I was settling for generic McMansions. Now I've found my true love - a brutalist concrete masterpiece. We're very happy."/>
           </motion.div>
           <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.4}>
            <TestimonialCard avatarInitials="J" name="James, 28" role="Urban Planner" quote="I swiped right on Art Deco and never looked back. My friends thought I was crazy, but they just don't understand our connection. Those geometric motifs complete me."/>
           </motion.div>
         </div>
       </div>
     </section>

      <section className="py-16 md:py-24 bg-slate-800 text-white text-center relative z-10">
       <div className="container mx-auto px-4">
         <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
          className="text-3xl md:text-4xl font-bold mb-6">Ready to Find Your Architectural Soulmate?</motion.h2>
         <motion.p variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2}
          className="text-xl mb-10 text-slate-300 max-w-xl mx-auto">Join thousands of architecture enthusiasts who've found their perfect style match.</motion.p>
         
         <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.4}
          className="flex flex-col sm:flex-row gap-4 justify-center">
           <button 
             onClick={() => router.push('/auth')} 
             className="
               px-8 py-3 
               bg-white text-black 
               rounded-full 
               font-semibold 
               shadow-lg 
               text-lg 
               smooth-transition 
               transform hover:scale-105 hover:bg-gray-200
               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
               flex items-center justify-center space-x-2
             "
           >
             Create Free Account
           </button>
           <button 
             onClick={() => router.push('/swipe')} 
             className={`${mainButtonClass} border-2 border-pink-500 hover:border-pink-400`}
           >
             Start Swiping Now
           </button>
         </motion.div>
         <motion.p variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.6}
          className="mt-6 text-sm text-pink-400">No buildings were harmed in the making of this app. Promise.</motion.p>
       </div>
     </section>

      <footer className="py-12 bg-slate-900 text-slate-400 relative z-10">
       <div className="container mx-auto px-4 text-center">
         <div className="text-3xl font-bold text-[rgb(var(--primary-rgb))] mb-4">ArchiSwipe</div>
         <p className="mb-2">© {new Date().getFullYear()} ArchiSwipe - The #1 App for Architecture Aficionados</p>
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