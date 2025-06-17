import { Group } from '@/utils/groups';
import { VideoTile } from './VideoTile';
import { GroupHeader } from './GroupHeader';

interface MicrophoneViewProps {
  groups: Group[];
  loudestStreamId?: string | null;
  localStream?: MediaStream | null;
  getVolumeForStream?: (streamId: string) => { volume: number; smoothedVolume: number } | undefined;
  className?: string;
}

export function MicrophoneView({ 
  groups, 
  loudestStreamId,
  localStream,
  getVolumeForStream,
  className = '' 
}: MicrophoneViewProps) {
  // Find the loudest peer and their group
  const findLoudestPeer = () => {
    if (loudestStreamId === 'local' && localStream) {
      return {
        type: 'local' as const,
        stream: localStream,
        volume: getVolumeForStream?.('local')?.smoothedVolume || 0
      };
    }

    for (const group of groups) {
      const peer = group.peers.find(p => p.id === loudestStreamId);
      if (peer) {
        return {
          type: 'peer' as const,
          peer,
          group,
          volume: getVolumeForStream?.(peer.id)?.smoothedVolume || 0
        };
      }
    }
    return null;
  };

  // Get all other streams organized by groups
  const getOtherStreams = () => {
    const otherStreams: Array<{
      type: 'local' | 'peer';
      stream?: MediaStream;
      peer?: any;
      group?: Group;
      volume: number;
    }> = [];

    // Add local stream if it's not the loudest
    if (localStream && loudestStreamId !== 'local') {
      otherStreams.push({
        type: 'local',
        stream: localStream,
        volume: getVolumeForStream?.('local')?.smoothedVolume || 0
      });
    }

    // Add other peers
    groups.forEach(group => {
      group.peers.forEach(peer => {
        if (peer.id !== loudestStreamId) {
          otherStreams.push({
            type: 'peer',
            peer,
            group,
            volume: getVolumeForStream?.(peer.id)?.smoothedVolume || 0
          });
        }
      });
    });

    return otherStreams;
  };

  const loudestPeer = findLoudestPeer();
  const otherStreams = getOtherStreams();

  // Group other streams by network
  const groupedOtherStreams = otherStreams.reduce((acc, stream) => {
    let groupKey: string;
    let groupName: string;

    if (stream.type === 'local') {
      groupKey = 'local';
      groupName = 'Your Camera';
    } else if (stream.group) {
      groupKey = stream.group.id;
      groupName = stream.group.name;
    } else {
      groupKey = 'unknown';
      groupName = 'Unknown Network';
    }

    if (!acc[groupKey]) {
      acc[groupKey] = {
        name: groupName,
        streams: []
      };
    }

    acc[groupKey].streams.push(stream);
    return acc;
  }, {} as Record<string, { name: string; streams: typeof otherStreams }>);

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Featured speaker - takes 2/3 of the space */}
        <div className="lg:col-span-2">
          <div className="h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Featured Speaker
            </h2>
            
            <div className="flex-1 flex items-center justify-center">
              {loudestPeer ? (
                <div className="w-full max-w-4xl">
                  {loudestPeer.type === 'local' ? (
                    <VideoTile
                      stream={loudestPeer.stream}
                      isLocal={true}
                      label="You (Speaking)"
                      size="large"
                      audioLevel={loudestPeer.volume}
                      isLoudest={true}
                      className="w-full h-96"
                    />
                  ) : (
                    <VideoTile
                      peer={loudestPeer.peer}
                      label={`${loudestPeer.peer.id.slice(-4)} (Speaking)`}
                      size="large"
                      audioLevel={loudestPeer.volume}
                      isLoudest={true}
                      className="w-full h-96"
                    />
                  )}
                  
                  {/* Speaker info */}
                  <div className="mt-4 text-center">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {loudestPeer.type === 'local' ? 'You are speaking' : 'Remote participant speaking'}
                    </p>
                    {loudestPeer.type === 'peer' && loudestPeer.group && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From {loudestPeer.group.name}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <p className="text-lg">No one is speaking</p>
                  <p className="text-sm">The loudest speaker will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other participants - 1/3 of the space */}
        <div className="lg:col-span-1">
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Other Participants
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {Object.entries(groupedOtherStreams).map(([groupKey, groupData]) => (
                <div key={groupKey} className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-1">
                    {groupData.name}
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {groupData.streams.map((stream, index) => (
                      <div key={`${groupKey}-${index}`}>
                        {stream.type === 'local' ? (
                          <VideoTile
                            stream={stream.stream}
                            isLocal={true}
                            label="You"
                            size="small"
                            audioLevel={stream.volume}
                            className="w-full h-24"
                          />
                        ) : (
                          <VideoTile
                            peer={stream.peer}
                            size="small"
                            audioLevel={stream.volume}
                            className="w-full h-24"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {otherStreams.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">No other participants</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
