/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
    destination: 'https://social-web-app-c1gd.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
