/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

module.exports = nextConfig;

