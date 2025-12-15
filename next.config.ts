import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Turbopack configuration for development
  turbopack: {
    root: __dirname,
  },

  // Experimental features
  experimental: {
    // Enable standalone mode
  },

  // Environment variables that should be available at build time
  env: {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  },
};

export default nextConfig;
