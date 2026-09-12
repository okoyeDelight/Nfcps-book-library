import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { externalDir: true },
  webpack(config) {
    config.resolve.alias['@appdeploy/client'] = path.resolve(__dirname, 'lib/appdeploy-client.ts');
    return config;
  },
};

export default nextConfig;
