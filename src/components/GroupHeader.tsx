import { Badge } from '@/components/ui/badge';
import { Group } from '@/utils/groups';

interface GroupHeaderProps {
  group: Group;
  isExpanded?: boolean;
  onToggle?: () => void;
  showStats?: boolean;
}

export function GroupHeader({ 
  group, 
  isExpanded = true, 
  onToggle,
  showStats = true 
}: GroupHeaderProps) {
  const peerCount = group.peers.length;
  const activePeers = group.peers.filter(peer => peer.audioLevel && peer.audioLevel > 0.01).length;

  return (
    <div 
      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 ${
        onToggle ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center space-x-3">
        {onToggle && (
          <div className="text-gray-500">
            {isExpanded ? '▼' : '▶'}
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {group.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Network: {group.networkPrefix}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {group.isLocal && (
          <Badge variant="outline" className="text-xs">
            Your Network
          </Badge>
        )}
        
        {showStats && (
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">
              {peerCount} device{peerCount !== 1 ? 's' : ''}
            </Badge>
            
            {activePeers > 0 && (
              <Badge variant="default" className="text-xs bg-green-500">
                {activePeers} active
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
