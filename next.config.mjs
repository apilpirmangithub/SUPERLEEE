/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization for IPFS and external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.builder.io',
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, geolocation=()',
          }
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Only tweak client-side chunks to avoid SSR bundling issues
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };

      // Reduce bundle size for client and polyfill/ignore node-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    } else {
      // Ensure server build does not attempt to bundle browser-specific libs into a shared vendors chunk
      // Keep server optimization defaults from Next.js
      config.optimization.splitChunks = config.optimization.splitChunks || undefined;
    }

    // Stub optional node/dev-only deps pulled by some web3 libs (both server & client)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
      encoding: false,
    };

    return config;
  },

  // Experimental features for better performance
  experimental: {
    scrollRestoration: true,
  },

  // Faster CI builds: skip TS type-check and ESLint during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // For standalone builds (Docker)
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
