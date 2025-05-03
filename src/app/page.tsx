// src/app/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [email, set_email] = useState('');

  const handle_email_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    set_email(e.target.value);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Pink Floating Elements - Decorative */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-pink-200 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-300 opacity-20 blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-pink-400 opacity-10 blur-3xl"></div>
        
        {/* Hearts decoration */}
        <div className="absolute top-24 right-12 text-pink-400 opacity-60 text-6xl">❤️</div>
        <div className="absolute top-40 left-16 text-pink-300 opacity-40 text-5xl">❤️</div>
        <div className="absolute bottom-48 right-32 text-pink-400 opacity-50 text-7xl">❤️</div>
        <div className="absolute bottom-1/4 left-1/4 text-pink-500 opacity-30 text-8xl">❤️</div>
        <div className="absolute top-1/2 right-1/3 text-pink-300 opacity-60 text-4xl rotate-12">❤️</div>
        <div className="absolute bottom-36 left-12 text-pink-400 opacity-40 text-5xl -rotate-12">❤️</div>
        <div className="absolute top-32 left-1/3 text-pink-500 opacity-25 text-7xl rotate-45">❤️</div>
        <div className="absolute top-2/3 right-20 text-pink-400 opacity-40 text-6xl -rotate-12">❤️</div>
      </div>
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-32 text-center px-4 z-10">
        {/* Logo and Nav */}
        <div className="flex justify-between items-center max-w-6xl mx-auto mb-16">
          <div className="text-3xl font-bold text-pink-700">ArchiSwipe</div>
          <nav className="hidden md:flex space-x-3 items-center">
            <Link href="/auth" className="px-4 py-2 bg-pink-100 text-pink-700 border border-pink-200 rounded-full hover:bg-pink-200 font-medium shadow-sm transition duration-300">
              Login
            </Link>
            <Link href="/swipe" className="px-4 py-2 bg-pink-700 text-white rounded-full hover:bg-pink-800 font-semibold shadow-md transition duration-300">
              Start Swiping
            </Link>
          </nav>
        </div>

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-6 text-gray-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Swipe Right on Architecture
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl text-gray-700 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Because relationships end, but Gothic columns are forever.
          </motion.p>

          {/* Main CTA */}
          <motion.div 
            className="flex justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button 
              onClick={() => router.push('/swipe')}
              className="px-8 py-4 bg-pink-700 text-white rounded-full hover:bg-pink-800 font-semibold shadow-md text-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
              Discover Architectural Styles
            </button>
          </motion.div>

          {/* Mock Phone */}
          <div className="relative max-w-xs mx-auto mt-16">
            <div className="rounded-3xl overflow-hidden border-8 border-pink-500 shadow-2xl">
              <div className="aspect-[9/16] bg-gray-100 relative">
                {/* Mock swipe interface */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-4/5 bg-white shadow-lg rounded-lg overflow-hidden relative">
                    <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                      <p className="text-sm text-gray-700">Swipe to find your architectural soulmate</p>
                    </div>
                    <div className="absolute bottom-0 w-full p-4 bg-white bg-opacity-90">
                      <p className="font-bold text-gray-800">Brutalist Beauty, 60</p>
                      <p className="text-sm text-gray-700">Loves: Concrete, Sharp Edges</p>
                      
                      {/* Action buttons */}
                      <div className="flex justify-center mt-2 space-x-4">
                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Find Your Perfect Architectural Match</h2>
          <p className="text-center text-pink-700 mb-12 text-lg italic">Form follows function, but love follows swipes.</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-pink-50 rounded-lg shadow-sm border border-pink-200 hover:shadow-md transition duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Swipe on Style</h3>
              <p className="text-gray-700">Tired of boring buildings? Swipe right on the facades that make your heart flutter.</p>
            </div>
            
            <div className="text-center p-6 bg-pink-50 rounded-lg shadow-sm border border-pink-200 hover:shadow-md transition duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Match with Masterpieces</h3>
              <p className="text-gray-700">Georgian, Neoclassical, or Mid-Century Modern - we won't judge your type.</p>
            </div>
            
            <div className="text-center p-6 bg-pink-50 rounded-lg shadow-sm border border-pink-200 hover:shadow-md transition duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Architectural Matchmaking</h3>
              <p className="text-gray-700">Our algorithm matches you with buildings that won't ghost you after 200 years.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-pink-600 text-white relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold mb-2">5M+</p>
              <p className="text-sm uppercase">Daily Swipes</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold mb-2">22</p>
              <p className="text-sm uppercase">Architectural Styles</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold mb-2">92%</p>
              <p className="text-sm uppercase">Match Success</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold mb-2">0</p>
              <p className="text-sm uppercase">Restraining Orders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-pink-50 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">What Our Users Say</h2>
          <p className="text-center text-pink-700 mb-12 text-lg italic">Real reviews from real architecture enthusiasts</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md border border-pink-200 relative">
              <div className="absolute -top-4 left-8 w-8 h-8 text-pink-600 bg-white rounded-full border border-pink-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-pink-200 rounded-full mr-4 flex items-center justify-center text-pink-700 font-bold">M</div>
                <div>
                  <h4 className="font-semibold text-gray-800">Margaret, 34</h4>
                  <p className="text-gray-700 text-sm">Architecture Professor</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"Before ArchiSwipe, I was settling for generic McMansions. Now I've found my true love - a brutalist concrete masterpiece with exposed ductwork. We're very happy together."</p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md border border-pink-200 relative">
              <div className="absolute -top-4 left-8 w-8 h-8 text-pink-600 bg-white rounded-full border border-pink-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-pink-200 rounded-full mr-4 flex items-center justify-center text-pink-700 font-bold">J</div>
                <div>
                  <h4 className="font-semibold text-gray-800">James, 28</h4>
                  <p className="text-gray-700 text-sm">Urban Planner</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"I swiped right on Art Deco and never looked back. My friends thought I was crazy, but they just don't understand our connection. Those geometric motifs complete me."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-pink-800 text-white text-center relative z-10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Find Your Architectural Soulmate?</h2>
          <p className="text-xl mb-8">Join thousands of architecture enthusiasts who've found their perfect style match.</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push('/auth')}
              className="px-8 py-4 bg-white text-pink-800 rounded-full hover:bg-gray-100 font-semibold text-lg shadow-md transition duration-300"
            >
              Create Account
            </button>
            <button 
              onClick={() => router.push('/swipe')}
              className="px-8 py-4 bg-pink-600 text-white border border-white rounded-full hover:bg-pink-700 font-semibold text-lg shadow-md transition duration-300"
            >
              Start Swiping Now
            </button>
          </div>
          <p className="mt-4 text-pink-200">No buildings were harmed in the making of this app.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-300 relative z-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="text-2xl font-bold text-pink-400">ArchiSwipe</div>
          </div>
          <p>© 2025 ArchiSwipe - The #1 Dating App for Architecture Aficionados</p>
          <p className="mt-2 text-sm">Warning: We are not responsible for any emotional attachment developed toward inanimate structures.</p>
          <div className="mt-4 flex justify-center space-x-4">
            <a href="#" className="hover:text-pink-300 transition duration-300">Terms</a>
            <a href="#" className="hover:text-pink-300 transition duration-300">Privacy</a>
            <a href="#" className="hover:text-pink-300 transition duration-300">Contact</a>
          </div>
          <p className="mt-6 text-xs text-gray-400">
            Note: Sometimes "it's not you, it's them." Even the most beautiful Art Nouveau facade might be hiding serious foundation issues.
          </p>
        </div>
      </footer>
    </main>
  );
}