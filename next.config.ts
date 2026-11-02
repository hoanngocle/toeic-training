import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/tts": ["./scripts/tts.py"],
    "/ets-2024/**": ["./data/ets-2024/tests.json"],
    "/api/ets": ["./data/ets-2024/tests.json"],
  },
  // Python is supplied by the host (or TTS_PYTHON), not bundled with Next.js.
  outputFileTracingExcludes: { "/api/tts": ["./.venv/**/*"] },
  experimental: {
    agentFeedback: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        // Preserve CSS Module exports; these files contain plain CSS.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
