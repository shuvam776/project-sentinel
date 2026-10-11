/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
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
    const rawApi = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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

