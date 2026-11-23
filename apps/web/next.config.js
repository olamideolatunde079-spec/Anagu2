/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
    NEXT_PUBLIC_MQTT_URL: process.env.NEXT_PUBLIC_MQTT_URL || "ws://localhost:8083/mqtt",
  },
  // Allow cross-origin requests to backend in dev
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
