import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
