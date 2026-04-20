/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // mongoose uses node-only APIs, mark it external for the server bundle
    serverComponentsExternalPackages: ["mongoose"],
  },
};

export default nextConfig;
