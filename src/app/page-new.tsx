'use client';

import { PeerProvider, usePeerContext } from '@/components/PeerProvider';
import { VideoGrid } from '@/components/VideoGrid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function VideoApp() {
  const {
    groups,
    localStream,
    peerId,
    isConnected,
    connections,
    loudestStreamId,
    getVolumeForStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    isLoading,
    error
  } = usePeerContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Setting up video chat...</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Initializing camera, microphone, and network connection
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="p-8 text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Controls Bar */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Multi-Camera Video Chat</h1>
              <div className="flex items-center space-x-2">
                <Button
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? "📹" : "📷"} Camera
                </Button>
                <Button
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? "🎤" : "🔇"} Mic
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Connected devices: {connections.length + (localStream ? 1 : 0)}
            </div>
          </div>
        </Card>

        {/* Main Video Grid */}
        <VideoGrid
          groups={groups}
          loudestStreamId={loudestStreamId}
          localStream={localStream}
          getVolumeForStream={getVolumeForStream}
          peerId={peerId}
          isConnected={isConnected}
          connectionCount={connections.length}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <PeerProvider>
      <VideoApp />
    </PeerProvider>
  );
}
