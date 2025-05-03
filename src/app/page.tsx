// Example modification in src/app/page.tsx
import { supabase } from '@/app/lib/supabaseClient'; // Adjust import path if needed

export default function Home() {
  console.log('Supabase Client Initialized:', supabase); // Check browser console
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* Default Next.js content */}
      <h1>ArchiSwipe</h1>
    </main>
  );
}