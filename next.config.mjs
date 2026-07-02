/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "localwala.tech",
      },
      {
        protocol: "https",
        hostname: "www.localwala.tech",
      },
      {
        protocol: "https",
        hostname: "localwalafood.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "three"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.cache = false;
    }
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "three-stdlib": "three-stdlib",
    };
    return config;
  },
};

export default nextConfig;
