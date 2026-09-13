/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://social-web-app.onrender.com/api/:path*', // Replace with your exact backend service Render URL if it differs
      },
    ];
  },
};

export default nextConfig;
