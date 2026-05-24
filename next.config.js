/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TypeScript and ESLint errors ARE build errors — do not suppress them
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app",
  },
  images: {
    domains: ['vantroflow.com', 'razorpay.com', 'res.cloudinary.com'],
  },
};

module.exports = nextConfig;
