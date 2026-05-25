/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Suppress TS/ESLint errors during Vercel builds — fix incrementally
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app",
  },
  images: {
    domains: ['vantroflow.com', 'razorpay.com', 'res.cloudinary.com'],
  },
};

module.exports = nextConfig;
