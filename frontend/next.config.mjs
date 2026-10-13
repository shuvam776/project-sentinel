/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },

  env: {
    API_URL: process.env.API_URL || "",
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "AIzaSyD7I8zcU_JakB9NjJDo4cuUMAP6MvPcxhk",
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || "shabey-ce4be.firebaseapp.com",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "shabey-ce4be",
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "shabey-ce4be.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || "732785567614",
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || "1:732785567614:web:7e6bddfcbd37a8e4dd752f",
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID || "G-JJQQSNVXT9",
  },

  async redirects() {
    return [
      {
        source: "/video/:id",
        destination: "/videos/:id",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const rawApi =
      process.env.SENTINEL_BACKEND_URL ||
      process.env.BACKEND_URL ||
      process.env.API_URL ||
      process.env.SERVER_URL ||
      (process.env.NODE_ENV === "production" ? "http://backend:8000" : "http://127.0.0.1:8000");
    const backendRoot = rawApi.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendRoot}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${backendRoot}/health`,
      },
    ];
  },
};

export default nextConfig;

