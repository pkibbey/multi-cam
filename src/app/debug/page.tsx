'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DiagnosticInfo {
  userAgent: string;
  isMobile: boolean;
  isAndroidChrome: boolean;
  isHTTPS: boolean;
  isLocalhost: boolean;
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
  hasLegacyGetUserMedia: boolean;
  hasWebkitGetUserMedia: boolean;
  hasWebRTC: boolean;
  mediaDevices: string[];
  networkConnection: string;
  permissions: {
    camera: string;
    microphone: string;
  };
  webViewDetected: boolean;
}

export default function DebugPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [testResults, setTestResults] = useState<{
    media: string;
    network: string;
    peer: string;
  }>({
    media: 'Not tested',
    network: 'Not tested',
    peer: 'Not tested'
  });

  useEffect(() => {
    async function gatherDiagnostics() {
      const info: DiagnosticInfo = {
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isAndroidChrome: /Android.*Chrome/i.test(navigator.userAgent) && !/Edge|OPR|Samsung/i.test(navigator.userAgent),
        isHTTPS: window.location.protocol === 'https:',
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        isSecureContext: window.isSecureContext,
        hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        hasLegacyGetUserMedia: !!(navigator as any).getUserMedia,
        hasWebkitGetUserMedia: !!(navigator as any).webkitGetUserMedia,
        hasWebRTC: !!(window.RTCPeerConnection),
        mediaDevices: [],
        networkConnection: 'unknown',
        permissions: {
          camera: 'unknown',
          microphone: 'unknown'
        },
        webViewDetected: /WebView|wv\)/i.test(navigator.userAgent)
      };

      // Check media devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          info.mediaDevices = devices.map(device => `${device.kind}: ${device.label || 'Unknown'}`);
        } catch (err) {
          info.mediaDevices = ['Error enumerating devices'];
        }
      }

      // Check network connection
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        info.networkConnection = `Type: ${conn.effectiveType || 'unknown'}, Downlink: ${conn.downlink || 'unknown'}Mbps`;
      }

      // Check permissions
      if ('permissions' in navigator) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          info.permissions.camera = cameraPermission.state;
        } catch (err) {
          info.permissions.camera = 'error';
        }

        try {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          info.permissions.microphone = micPermission.state;
        } catch (err) {
          info.permissions.microphone = 'error';
        }
      }

      setDiagnostics(info);
    }

    gatherDiagnostics();
  }, []);

  const testMediaAccess = async () => {
    try {
      setTestResults(prev => ({ ...prev, media: 'Testing...' }));
      
      // Use the same fallback logic as the main hook
      let getUserMediaFunction: ((constraints: MediaStreamConstraints) => Promise<MediaStream>) | null = null;
      let method = 'unknown';

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getUserMediaFunction = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        method = 'Modern API';
      } else if ((navigator as any).getUserMedia) {
        getUserMediaFunction = (constraints: MediaStreamConstraints) => {
          return new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).getUserMedia(constraints, resolve, reject);
          });
        };
        method = 'Legacy API';
      } else if ((navigator as any).webkitGetUserMedia) {
        getUserMediaFunction = (constraints: MediaStreamConstraints) => {
          return new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).webkitGetUserMedia(constraints, resolve, reject);
          });
        };
        method = 'WebKit API';
      } else {
        throw new Error('No getUserMedia implementation found');
      }

      const stream = await getUserMediaFunction({ video: true, audio: true });
      setTestResults(prev => ({ 
        ...prev, 
        media: `✅ Success (${method}) - Video: ${stream.getVideoTracks().length}, Audio: ${stream.getAudioTracks().length}` 
      }));
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      const errorName = err instanceof Error ? err.name : 'Unknown';
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTestResults(prev => ({ 
        ...prev, 
        media: `❌ Failed (${errorName}) - ${errorMessage}` 
      }));
    }
  };

  const testNetworkDetection = async () => {
    try {
      setTestResults(prev => ({ ...prev, network: 'Testing...' }));
      const { detectNetworkInfo } = await import('@/utils/network');
      const networkInfo = await detectNetworkInfo();
      setTestResults(prev => ({ 
        ...prev, 
        network: `✅ Success - ${networkInfo}` 
      }));
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        network: `❌ Failed - ${err instanceof Error ? err.message : 'Unknown error'}` 
      }));
    }
  };

  const testPeerConnection = async () => {
    try {
      setTestResults(prev => ({ ...prev, peer: 'Testing...' }));
      const { default: Peer } = await import('peerjs');
      const peer = new Peer();
      
      await new Promise((resolve, reject) => {
        peer.on('open', () => resolve(null));
        peer.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
      
      setTestResults(prev => ({ 
        ...prev, 
        peer: `✅ Success - Peer ID: ${peer.id}` 
      }));
      peer.destroy();
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        peer: `❌ Failed - ${err instanceof Error ? err.message : 'Unknown error'}` 
      }));
    }
  };

  if (!diagnostics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Gathering diagnostics...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">Video Chat Diagnostics</h1>
          <p className="text-gray-600">Use this page to debug issues with video chat setup, especially on mobile devices.</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div><strong>Mobile Device:</strong> {diagnostics.isMobile ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Android Chrome:</strong> {diagnostics.isAndroidChrome ? '✅ Yes' : '❌ No'}</div>
              <div><strong>WebView Detected:</strong> {diagnostics.webViewDetected ? '⚠️ Yes' : '✅ No'}</div>
              <div><strong>HTTPS:</strong> {diagnostics.isHTTPS ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Secure Context:</strong> {diagnostics.isSecureContext ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Localhost:</strong> {diagnostics.isLocalhost ? '✅ Yes' : '❌ No'}</div>
            </div>
            <div className="space-y-2">
              <div><strong>Modern getUserMedia:</strong> {diagnostics.hasGetUserMedia ? '✅ Available' : '❌ Not available'}</div>
              <div><strong>Legacy getUserMedia:</strong> {diagnostics.hasLegacyGetUserMedia ? '✅ Available' : '❌ Not available'}</div>
              <div><strong>WebKit getUserMedia:</strong> {diagnostics.hasWebkitGetUserMedia ? '✅ Available' : '❌ Not available'}</div>
              <div><strong>WebRTC:</strong> {diagnostics.hasWebRTC ? '✅ Available' : '❌ Not available'}</div>
              <div><strong>Camera Permission:</strong> {diagnostics.permissions.camera}</div>
              <div><strong>Microphone Permission:</strong> {diagnostics.permissions.microphone}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Media Devices</h2>
          <div className="space-y-1 text-sm font-mono">
            {diagnostics.mediaDevices.map((device, i) => (
              <div key={i}>{device}</div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Component Tests</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Media Access Test:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{testResults.media}</span>
                <Button size="sm" onClick={testMediaAccess}>Test</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Network Detection Test:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{testResults.network}</span>
                <Button size="sm" onClick={testNetworkDetection}>Test</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Peer Connection Test:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{testResults.peer}</span>
                <Button size="sm" onClick={testPeerConnection}>Test</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">User Agent</h2>
          <p className="text-xs font-mono break-all">{diagnostics.userAgent}</p>
        </Card>

        {/* Android Chrome specific guidance */}
        {diagnostics.isAndroidChrome && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">📱 Android Chrome Detected</h2>
            <div className="space-y-3 text-sm">
              {!diagnostics.isSecureContext && (
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <strong className="text-red-800">⚠️ Secure Context Required:</strong>
                  <p className="text-red-700 mt-1">
                    Android Chrome requires HTTPS for camera/microphone access. Use the HTTPS development server.
                  </p>
                </div>
              )}
              
              {diagnostics.webViewDetected && (
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                  <strong className="text-yellow-800">⚠️ WebView Detected:</strong>
                  <p className="text-yellow-700 mt-1">
                    You're using an embedded browser. Try opening this page directly in Chrome instead of through an app.
                  </p>
                </div>
              )}
              
              {!diagnostics.hasGetUserMedia && !diagnostics.hasLegacyGetUserMedia && !diagnostics.hasWebkitGetUserMedia && (
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <strong className="text-red-800">❌ No getUserMedia Support:</strong>
                  <p className="text-red-700 mt-1">
                    Your Chrome version might be too old. Try updating Chrome to the latest version.
                  </p>
                </div>
              )}
              
              <div className="bg-blue-100 border border-blue-300 rounded p-3">
                <strong className="text-blue-800">💡 Android Chrome Tips:</strong>
                <ul className="text-blue-700 mt-1 space-y-1 ml-4">
                  <li>• Make sure Chrome is updated to the latest version</li>
                  <li>• Clear site data and try again if permissions are denied</li>
                  <li>• Tap "Allow" when prompted for camera/microphone access</li>
                  <li>• Check Chrome settings → Site settings → Camera/Microphone</li>
                  <li>• Try incognito mode to test without cached permissions</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* General troubleshooting */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Troubleshooting</h2>
          <div className="space-y-3 text-sm">
            {!diagnostics.hasGetUserMedia && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <strong className="text-red-800">No Modern getUserMedia:</strong>
                <p className="text-red-700 mt-1">Your browser doesn't support modern media APIs. Update your browser or try Chrome/Firefox.</p>
              </div>
            )}
            
            {!diagnostics.isSecureContext && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <strong className="text-yellow-800">Not a Secure Context:</strong>
                <p className="text-yellow-700 mt-1">Use HTTPS or localhost for camera/microphone access.</p>
              </div>
            )}
            
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <strong className="text-gray-800">Still having issues?</strong>
              <ol className="text-gray-700 mt-1 space-y-1 ml-4">
                <li>1. Run the setup script: <code className="bg-gray-200 px-1 rounded">node setup-https.js</code></li>
                <li>2. Start HTTPS server: <code className="bg-gray-200 px-1 rounded">npm run dev:https</code></li>
                <li>3. Access via HTTPS on your phone</li>
                <li>4. Run the tests above to identify specific issues</li>
              </ol>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex gap-4">
            <Button onClick={() => window.location.href = '/'}>
              Back to Video Chat
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Diagnostics
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
