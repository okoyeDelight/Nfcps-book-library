import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleDir = name => path.resolve(__dirname, 'node_modules', name);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { externalDir: true },
  webpack(config) {
    config.resolve.alias['@appdeploy/client'] = path.resolve(__dirname, 'lib/appdeploy-client.ts');
    config.resolve.alias['react'] = moduleDir('react');
    config.resolve.alias['react-dom'] = moduleDir('react-dom');
    config.resolve.alias['lucide-react'] = moduleDir('lucide-react');
    return config;
  },
};

export default nextConfig;
