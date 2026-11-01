import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/api/tts": ["./scripts/tts.py"] },
  // Python is supplied by the host (or TTS_PYTHON), not bundled with Next.js.
  outputFileTracingExcludes: { "/api/tts": ["./.venv/**/*"] },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
