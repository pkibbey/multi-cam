import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PeerConnectionControlsProps {
  peerId?: string | null;
  isConnected?: boolean;
  onCall?: (targetPeerId: string) => void;
}

export function PeerConnectionControls({ 
  peerId, 
  isConnected, 
  onCall 
}: PeerConnectionControlsProps) {
  const [targetPeerId, setTargetPeerId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleCall = async () => {
    if (!targetPeerId.trim() || !onCall || !isConnected) return;
    
    setIsConnecting(true);
    try {
      onCall(targetPeerId.trim());
      // Reset after a delay
      setTimeout(() => {
        setIsConnecting(false);
        setTargetPeerId('');
      }, 2000);
    } catch (error) {
      console.error('Failed to call peer:', error);
      setIsConnecting(false);
    }
  };

  const copyPeerId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
    }
  };

  if (!isConnected || !peerId) {
    return (
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="text-center">
          <div className="text-yellow-600 dark:text-yellow-400 mb-2">
            {!peerId ? 'Initializing...' : 'Connecting to peer server...'}
          </div>
          {peerId && (
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Your ID: </span>
              <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded text-xs">
                {peerId}
              </code>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Your Peer ID */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Peer ID (share this with others)
          </h3>
          <div className="flex items-center space-x-2">
            <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm font-mono">
              {peerId}
            </code>
            <Button size="sm" variant="outline" onClick={copyPeerId}>
              Copy
            </Button>
          </div>
        </div>

        {/* Connect to Peer */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Connect to another device
          </h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Enter peer ID..."
              value={targetPeerId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetPeerId(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCall()}
              disabled={isConnecting}
              className="flex-1"
            />
            <Button 
              onClick={handleCall}
              disabled={!targetPeerId.trim() || isConnecting}
              size="sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ask someone else to share their peer ID, then enter it here to connect
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
            How to connect multiple devices:
          </h4>
          <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>1. Open this page on multiple devices (phones, laptops, etc.)</li>
            <li>2. Allow camera and microphone access on each device</li>
            <li>3. Copy your peer ID from one device and paste it into another</li>
            <li>4. Click "Connect" and both devices will see each other's video</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}
