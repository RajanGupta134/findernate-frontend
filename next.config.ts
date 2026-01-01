import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const nextConfig: NextConfig = {
  images: {
    domains: ['findernate-media.b-cdn.net', 'res.cloudinary.com', 'example.com', 'images.pexels.com', 'ui-avatars.com', 'cdn.pixabay.com', 'picsum.photos',"randomuser.me","images.unsplash.com","media.istockphoto.com","localhost","www.pexels.com", "getstream.io" ],
    formats: ['image/avif', 'image/webp']

  },
  // Disable static page generation to prevent SSR document errors
  output: 'standalone',
  experimental: {
    // Force all pages to use dynamic rendering
  },
  async headers() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      }
    ];
  },
  // Use a dev-time proxy to avoid CORS in the browser by keeping same-origin requests
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  }
};

export default nextConfig; 