/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // This will now properly take effect
  turbopack: {
    root: '../../',
  },
};

export default nextConfig;