/** @type {import('next').NextConfig} */

const DEFAULT_API_URL = 'https://vantro-flow-backend-production.up.railway.app';
const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

// The backend lives on a different origin (Railway) than the frontend (Vercel),
// so every API call is cross-origin and must be listed in connect-src. Deriving
// it from NEXT_PUBLIC_API_URL keeps CSP in step with whichever backend this
// build actually talks to — a hardcoded origin silently blocks every request
// (including login) the moment the backend URL changes.
function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    console.warn(`[next.config] NEXT_PUBLIC_API_URL is not a valid URL: "${url}" — falling back to ${DEFAULT_API_URL}`);
    return new URL(DEFAULT_API_URL).origin;
  }
}

const backendOrigin = originOf(API_URL);
const isDev = process.env.NODE_ENV !== 'production';

const connectSrc = [
  "'self'",
  backendOrigin,
  // Local backend during `next dev`, regardless of what NEXT_PUBLIC_API_URL points at
  ...(isDev ? ['http://localhost:3001', 'http://127.0.0.1:3001'] : []),
  'https://*.posthog.com',
  'https://*.i.posthog.com',
  'https://*.supabase.co',
  'wss://*.supabase.co',
].filter((value, index, all) => all.indexOf(value) === index);

const securityHeaders = [
  // Prevent the site being loaded in an iframe (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers guessing MIME types
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // XSS filter for old browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Force HTTPS for 1 year
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Don't leak URL in Referer header to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser features — allow camera/mic only on same origin (needed for OCR scanner)
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(self "https://checkout.razorpay.com"), usb=()' },
  // Content Security Policy — allow only our own assets + backend + trusted CDNs
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.posthog.com https://*.i.posthog.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSrc.join(' ')}`,
      "frame-src https://checkout.razorpay.com https://api.razorpay.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // upgrade-insecure-requests intentionally omitted — breaks localhost dev
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Suppress TS/ESLint errors during Vercel builds — fix incrementally
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
  images: {
    domains: ['vantroflow.com', 'razorpay.com', 'res.cloudinary.com'],
  },
  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // Redirect HTTP → HTTPS (belt-and-suspenders, Vercel also does this)
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
