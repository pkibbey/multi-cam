import { useState } from 'react';
import { Group } from '@/utils/groups';
import { GroupHeader } from './GroupHeader';
import { VideoTile } from './VideoTile';

interface GroupedVideosProps {
  groups: Group[];
  loudestStreamId?: string | null;
  localStream?: MediaStream | null;
  getVolumeForStream?: (streamId: string) => { volume: number; smoothedVolume: number } | undefined;
  className?: string;
}

export function GroupedVideos({ 
  groups, 
  loudestStreamId,
  localStream,
  getVolumeForStream,
  className = '' 
}: GroupedVideosProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (groups.length === 0 && !localStream) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No video streams</p>
          <p className="text-sm">Waiting for participants to join...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Local stream first if available */}
      {localStream && (
        <div className="group-section">
          <GroupHeader 
            group={{
              id: 'local',
              name: 'Your Camera',
              peers: [],
              isLocal: true,
              networkPrefix: 'local'
            }}
            showStats={false}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <VideoTile
              stream={localStream}
              isLocal={true}
              label="You"
              size="medium"
              audioLevel={getVolumeForStream?.('local')?.smoothedVolume || 0}
              isLoudest={loudestStreamId === 'local'}
            />
          </div>
        </div>
      )}

      {/* Remote peer groups */}
      {groups.map(group => {
        if (group.peers.length === 0) return null;
        
        const isCollapsed = collapsedGroups.has(group.id);
        
        return (
          <div key={group.id} className="group-section">
            <GroupHeader 
              group={group}
              isExpanded={!isCollapsed}
              onToggle={() => toggleGroup(group.id)}
            />
            
            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.peers.map(peer => {
                  const volumeData = getVolumeForStream?.(peer.id);
                  const audioLevel = volumeData?.smoothedVolume || 0;
                  
                  return (
                    <VideoTile
                      key={peer.id}
                      peer={peer}
                      audioLevel={audioLevel}
                      isLoudest={loudestStreamId === peer.id}
                      size="medium"
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state when no peers */}
      {groups.every(group => group.peers.length === 0) && (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg mb-2">No other participants</p>
          <p className="text-sm">Share your peer ID for others to connect</p>
        </div>
      )}
    </div>
  );
}
