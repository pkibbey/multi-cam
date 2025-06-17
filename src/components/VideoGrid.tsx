import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Group } from '@/utils/groups';
import { GroupedVideos } from './GroupedVideos';
import { MicrophoneView } from './MicrophoneView';
import { PeerConnectionControls } from './PeerConnectionControls';

interface VideoGridProps {
  groups: Group[];
  loudestStreamId?: string | null;
  localStream?: MediaStream | null;
  getVolumeForStream?: (streamId: string) => { volume: number; smoothedVolume: number } | undefined;
  peerId?: string | null;
  isConnected?: boolean;
  connectionCount?: number;
  onCall?: (targetPeerId: string) => void;
}

type ViewMode = 'grid' | 'microphone';

export function VideoGrid({ 
  groups, 
  loudestStreamId,
  localStream,
  getVolumeForStream,
  peerId,
  isConnected = false,
  connectionCount = 0,
  onCall
}: VideoGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const totalPeers = groups.reduce((sum, group) => sum + group.peers.length, 0);
  const activePeers = groups.reduce((sum, group) => 
    sum + group.peers.filter(peer => 
      getVolumeForStream?.(peer.id)?.smoothedVolume && 
      getVolumeForStream(peer.id)!.smoothedVolume > 0.01
    ).length, 0
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with controls and stats */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Video Chat
            </h1>
            
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              
              <Badge variant="secondary">
                {totalPeers} participant{totalPeers !== 1 ? 's' : ''}
              </Badge>
              
              {activePeers > 0 && (
                <Badge variant="default" className="bg-green-500">
                  {activePeers} speaking
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View mode toggle */}
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                Grid View
              </Button>
              <Button
                variant={viewMode === 'microphone' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('microphone')}
                className="rounded-l-none"
              >
                Speaker View
              </Button>
            </div>
          </div>
        </div>

        {/* Peer ID for sharing */}
        {peerId && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <PeerConnectionControls
              peerId={peerId}
              isConnected={isConnected}
              onCall={onCall}
            />
          </div>
        )}
      </Card>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'grid' ? (
          <GroupedVideos
            groups={groups}
            loudestStreamId={loudestStreamId}
            localStream={localStream}
            getVolumeForStream={getVolumeForStream}
            className="h-full overflow-y-auto"
          />
        ) : (
          <MicrophoneView
            groups={groups}
            loudestStreamId={loudestStreamId}
            localStream={localStream}
            getVolumeForStream={getVolumeForStream}
            className="h-full"
          />
        )}
      </div>

      {/* Connection status footer */}
      {!isConnected && (
        <Card className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-yellow-800 dark:text-yellow-300">
              Connecting to peer server...
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
