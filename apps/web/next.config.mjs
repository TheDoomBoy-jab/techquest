/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.172.4.173', 'localhost',"192.172.7.43","192.171.2.94"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;