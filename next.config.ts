import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = { poweredByHeader: false, outputFileTracingRoot: path.join(process.cwd()), experimental: { cpus: 1, serverActions: { bodySizeLimit: "2mb" } } };
export default nextConfig;
