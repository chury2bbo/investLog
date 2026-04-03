import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://192.168.2.19:3000", "http://192.168.2.19", "192.168.2.19"],
  devIndicators: false,
};

export default nextConfig;
