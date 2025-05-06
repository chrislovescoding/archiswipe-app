// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'placehold.co',
          port: '',
          pathname: '/**', // Allows any path under this hostname
        },
        // You might need to add your Supabase storage hostname here later
        // if you plan to use next/image with Supabase storage URLs.
        // Example for Supabase (replace YOUR_PROJECT_ID with your actual ID):
        // {
        //   protocol: 'https',
        //   hostname: 'YOUR_PROJECT_ID.supabase.co', // or your custom domain if any
        //   port: '',
        //   pathname: '/storage/v1/object/public/**',
        // },
      ],
    },
    eslint: {
      // Warning: This allows production builds to successfully complete even if
      // your project has ESLint errors.
      ignoreDuringBuilds: true,
    },
  };
  
  export default nextConfig;