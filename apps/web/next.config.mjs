/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.172.4.173', 'localhost',"192.172.7.43","192.171.2.94"],
  images: {
    unoptimized: true,
  },
  outputFileTracingExcludes: {
    '*': ['.env*', '**/.env*'],
  },
  async rewrites() {
    const gateway = (
      process.env.GATEWAY_URL ||
      process.env.NEXT_PUBLIC_GATEWAY_URL ||
      'http://localhost:8000'
    ).replace(/\/$/, '');

    return [
      {
        source: '/api/orchestrator/:path*',
        destination: `${gateway}/api/orchestrator/:path*`,
      },
      {
        source: '/api/patients/:path*',
        destination: `${gateway}/api/patients/:path*`,
      },
      {
        source: '/api/hitl/:path*',
        destination: `${gateway}/api/hitl/:path*`,
      },
      {
        source: '/api/reports/:path*',
        destination: `${gateway}/api/reports/:path*`,
      },
      {
        source: '/api/extract-comment',
        destination: `${gateway}/api/extract-comment`,
      },
    ];
  },
};

export default nextConfig;