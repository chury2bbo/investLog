import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://192.168.2.16:3000", "http://192.168.2.16", "192.168.2.16"],
  devIndicators: false,
};

export default nextConfig;
