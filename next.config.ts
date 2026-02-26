import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/powerroof-landing.html",
      },
    ];
  },
};

export default nextConfig;
