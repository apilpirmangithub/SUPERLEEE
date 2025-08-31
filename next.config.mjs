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
    // Optimize bundle size
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

    // Reduce bundle size for client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // For standalone builds (Docker)
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
