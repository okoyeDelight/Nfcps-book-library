/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const repoName = 'Nfcps-book-library';

const nextConfig = {
  images: { unoptimized: true },
  output: isGitHubPages ? 'export' : undefined,
  trailingSlash: true,
  basePath: isGitHubPages ? `/${repoName}` : '',
  assetPrefix: isGitHubPages ? `/${repoName}/` : undefined,
};

export default nextConfig;
