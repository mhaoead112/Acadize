import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack(config) {
    config.resolve.alias["@assets"] = path.resolve(
      process.cwd(),
      "../../attached_assets"
    );
    return config;
  },
};

export default nextConfig;
