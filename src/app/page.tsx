// src/app/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
// CORRECTED IMPORT: Aliased Home icon to HomeIcon
import { Heart, Home as HomeIcon, Compass, MessageSquare, Users, CheckCircle, BarChart2, Star } from 'lucide-react'; 

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
      <div className="w-14 h-14 bg-[rgb(var(--primary-light-rgb))] rounded-full mr-4 flex items-center justify-center text-[rgb(var(--primary-rgb))] font-bold text-xl">
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


export default function Home() { // This is the page component
  const router = useRouter();
  const { session, isLoading: isLoadingAuth } = useAuth();

  const navLinkBase = "px-4 py-2 rounded-full font-medium smooth-transition text-sm shadow-sm hover:shadow-md";
  const navLinkPrimary = `${navLinkBase} bg-[rgb(var(--primary-rgb))] text-white hover:bg-[rgb(var(--primary-hover-rgb))]`;
  const navLinkSecondary = `${navLinkBase} bg-white text-[rgb(var(--primary-rgb))] border border-[rgb(var(--primary-light-rgb))] hover:bg-[rgba(var(--primary-light-rgb),0.3)]`;

  const mainButtonClass = "px-8 py-3 bg-[rgb(var(--primary-rgb))] text-white rounded-full hover:bg-[rgb(var(--primary-hover-rgb))] font-semibold shadow-lg text-lg smooth-transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary-rgb))] flex items-center justify-center space-x-2";

  // Variants for Framer Motion
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-50">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-pink-200/30 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-rose-300/30 blur-3xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-fuchsia-400/20 blur-3xl animate-pulse-slow animation-delay-4000"></div>
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
            className="text-5xl md:text-7xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-fuchsia-600"
          >
            Swipe Right on Architecture
          </motion.h1>
          <motion.p
             variants={fadeIn} initial="hidden" animate="visible" custom={0.2}
            className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto"
          >
            Because relationships end, but Gothic columns are forever. Find your structural soulmate.
          </motion.p>

          <motion.div  variants={fadeIn} initial="hidden" animate="visible" custom={0.4}>
            <button onClick={() => router.push('/swipe')} className={mainButtonClass}>
              <span>Discover Your Style</span>
              <Compass size={22} />
            </button>
          </motion.div>

           <motion.div 
            variants={fadeIn} initial="hidden" animate="visible" custom={0.6}
            className="relative max-w-xs mx-auto mt-16 md:mt-24 group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-3xl blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
             <div className="relative rounded-3xl overflow-hidden border-8 border-slate-800 shadow-2xl bg-slate-700">
               <div className="aspect-[9/16] bg-gray-100 relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-6 bg-slate-800 rounded-b-lg z-10"></div>
                 <div className="absolute inset-0 flex items-center justify-center p-2">
                   <div className="w-full h-full bg-white shadow-lg rounded-lg overflow-hidden relative flex flex-col">
                      <Image src="/placeholder-arch.jpg" alt="Architecture Example" width={300} height={400} className="object-cover h-3/4 w-full"/>
                     <div className="p-3 bg-white border-t border-gray-200 flex-grow">
                       <p className="font-bold text-slate-800 text-sm">Brutalist Beauty, 60</p>
                       <p className="text-xs text-slate-600">Loves: Concrete, Sharp Edges</p>
                     </div>
                     <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-6 p-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-300 text-red-500 flex items-center justify-center shadow-md">
                           {/* CORRECTED USAGE: HomeIcon */}
                           <HomeIcon size={20} strokeWidth={2.5}/> 
                         </div>
                         <div className="w-12 h-12 rounded-full bg-pink-100 border-2 border-pink-300 text-pink-600 flex items-center justify-center shadow-lg transform scale-110">
                           <Heart size={24} strokeWidth={2.5} fill="currentColor"/>
                         </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white/70 backdrop-blur-sm relative z-10">
       <div className="container mx-auto px-4">
         <motion.h2  variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-6 text-slate-800">Find Your Perfect Architectural Match</motion.h2>
         <motion.p  variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2}
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
             // CORRECTED USAGE: HomeIcon
             { icon: <HomeIcon size={32} className="mx-auto mb-2 opacity-80"/>, value: "22+", label: "Architectural Styles" },
             { icon: <Heart size={32} className="mx-auto mb-2 opacity-80"/>, value: "92%", label: "Match Success" },
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
         <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
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
         <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold mb-6">Ready to Find Your Architectural Soulmate?</motion.h2>
         <motion.p variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2}
          className="text-xl mb-10 text-slate-300 max-w-xl mx-auto">Join thousands of architecture enthusiasts who've found their perfect style match.</motion.p>
         <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.4}
          className="flex flex-col sm:flex-row gap-4 justify-center">
           <button onClick={() => router.push('/auth')} className={`${mainButtonClass} bg-white text-slate-800 hover:bg-gray-100`}>
             Create Free Account
           </button>
           <button onClick={() => router.push('/swipe')} className={`${mainButtonClass} border-2 border-pink-500 hover:border-pink-400`}>
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