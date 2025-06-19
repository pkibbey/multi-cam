import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost', '192.168.1.207',
  ],
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Enable HTTPS redirect in production
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          // Allow camera and microphone access
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, display-capture=*'
          },
          // Enable secure context for WebRTC
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
