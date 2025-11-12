import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/german-organigram',
  assetPrefix: '/german-organigram',
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['d3-org-chart', 'd3'],
  // Optimize CSS loading
  experimental: {
    optimizeCss: true,
  }
};

export default nextConfig;
