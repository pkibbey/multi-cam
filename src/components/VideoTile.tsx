import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeerData } from '@/utils/groups';

interface VideoTileProps {
  peer?: PeerData;
  stream?: MediaStream;
  isLocal?: boolean;
  isMuted?: boolean;
  isLoudest?: boolean;
  audioLevel?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showControls?: boolean;
  peerId?: string;
  label?: string;
}

export function VideoTile({
  peer,
  stream,
  isLocal = false,
  isMuted = false,
  isLoudest = false,
  audioLevel = 0,
  className = '',
  size = 'medium',
  showControls = true,
  peerId,
  label
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const actualStream = stream || peer?.stream;
  const actualPeerId = peerId || peer?.id || 'unknown';
  const actualLabel = label || (isLocal ? 'You' : `Peer ${actualPeerId.slice(-4)}`);

  useEffect(() => {
    if (videoRef.current && actualStream) {
      videoRef.current.srcObject = actualStream;
    }
  }, [actualStream]);

  const sizeClasses = {
    small: 'w-32 h-24',
    medium: 'w-64 h-48',
    large: 'w-96 h-72'
  };

  const volumeIndicator = audioLevel > 0.01 ? (
    <div className="absolute bottom-2 left-2">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <div 
          className="w-8 h-1 bg-gray-300 rounded-full overflow-hidden"
        >
          <div 
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <Card className={`relative overflow-hidden ${sizeClasses[size]} ${className} ${
      isLoudest ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    }`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className="w-full h-full object-cover bg-gray-900"
      />
      
      {/* Overlay for labels and controls */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            {actualLabel}
          </Badge>
          {isLocal && (
            <Badge variant="outline" className="text-xs">
              Local
            </Badge>
          )}
          {isLoudest && (
            <Badge variant="default" className="text-xs bg-blue-500">
              Speaking
            </Badge>
          )}
        </div>

        {/* Muted indicator */}
        {isMuted && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-xs">
              Muted
            </Badge>
          </div>
        )}

        {/* Volume indicator */}
        {volumeIndicator}

        {/* Connection status */}
        <div className="absolute bottom-2 right-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>
      </div>

      {/* No video fallback */}
      {!actualStream && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-lg font-semibold">
                {actualLabel.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm opacity-75">No video</p>
          </div>
        </div>
      )}
    </Card>
  );
}
