'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useNetworkInfo } from '@/hooks/useNetworkInfo';
import { useGroups } from '@/hooks/useGroups';
import { useLocalMedia } from '@/hooks/useLocalMedia';
import { usePeer } from '@/hooks/usePeer';
import { useLoudestMicrophone } from '@/hooks/useLoudestMicrophone';
import { PeerData } from '@/utils/groups';

interface PeerContextType {
  // Network and grouping
  networkInfo: string;
  groups: ReturnType<typeof useGroups>['groups'];
  peers: ReturnType<typeof useGroups>['peers'];
  
  // Local media
  localStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  
  // Peer connection
  peerId: string | null;
  isConnected: boolean;
  connections: any[];
  call: (targetPeerId: string) => void;
  
  // Audio analysis
  loudestStreamId: string | null;
  getVolumeForStream: (streamId: string) => { volume: number; smoothedVolume: number } | undefined;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
}

const PeerContext = createContext<PeerContextType | null>(null);

export function usePeerContext() {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerContext must be used within a PeerProvider');
  }
  return context;
}

interface PeerProviderProps {
  children: React.ReactNode;
  peerServerOptions?: {
    host?: string;
    port?: number;
    path?: string;
  };
}

export function PeerProvider({ children, peerServerOptions }: PeerProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Add debug logging function
  const addDebugInfo = (info: string) => {
    console.log('[PeerProvider Debug]:', info);
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  // Check for HTTPS requirement on mobile
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isMobile && !isHTTPS && !isLocalhost) {
      setError('HTTPS is required for camera/microphone access on mobile devices. Please use HTTPS.');
      addDebugInfo('Mobile device detected without HTTPS');
      return;
    }

    addDebugInfo(`Platform: ${isMobile ? 'Mobile' : 'Desktop'}, Protocol: ${window.location.protocol}`);
  }, []);

  // Add timeout for loading state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('Setup timeout. Please check your camera/microphone permissions and network connection.');
        addDebugInfo('Setup timeout after 30 seconds');
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Initialize all hooks
  const { networkInfo, isLoading: networkLoading, error: networkError } = useNetworkInfo();
  const { groups, peers, addPeer, removePeer, updatePeerAudioLevel } = useGroups(networkInfo);
  const { 
    stream: localStream, 
    isVideoEnabled, 
    isAudioEnabled, 
    toggleVideo, 
    toggleAudio,
    error: mediaError 
  } = useLocalMedia();
  
  const { 
    peerId, 
    isConnected, 
    connections, 
    call: peerCall,
    error: peerError,
    setLocalStream
  } = usePeer(peerServerOptions) as any;
  
  const { 
    loudestStreamId, 
    addStream, 
    removeStream, 
    getVolumeForStream 
  } = useLoudestMicrophone() as any;

  // Enhanced debug logging for state changes
  useEffect(() => {
    addDebugInfo(`Network loading: ${networkLoading}, Network info: ${networkInfo || 'none'}`);
  }, [networkLoading, networkInfo]);

  useEffect(() => {
    addDebugInfo(`Local stream: ${localStream ? 'available' : 'none'}, Video: ${isVideoEnabled}, Audio: ${isAudioEnabled}`);
  }, [localStream, isVideoEnabled, isAudioEnabled]);

  useEffect(() => {
    addDebugInfo(`Peer ID: ${peerId || 'none'}, Connected: ${isConnected}`);
  }, [peerId, isConnected]);

  useEffect(() => {
    if (networkError) addDebugInfo(`Network error: ${networkError}`);
    if (mediaError) addDebugInfo(`Media error: ${mediaError}`);
    if (peerError) addDebugInfo(`Peer error: ${peerError}`);
  }, [networkError, mediaError, peerError]);

  // Create stable connection IDs for dependency tracking
  const connectionIds = useMemo(() => 
    connections.map((conn: any) => conn.id).sort().join(','), 
    [connections]
  );

  // Use ref to maintain current peers for audio level updates
  const peersRef = useRef(peers);
  const getVolumeForStreamRef = useRef(getVolumeForStream);
  const updatePeerAudioLevelRef = useRef(updatePeerAudioLevel);

  // Keep refs up to date
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);
  
  useEffect(() => {
    getVolumeForStreamRef.current = getVolumeForStream;
  }, [getVolumeForStream]);
  
  useEffect(() => {
    updatePeerAudioLevelRef.current = updatePeerAudioLevel;
  }, [updatePeerAudioLevel]);

  // Set local stream for peer when available
  useEffect(() => {
    if (localStream && setLocalStream) {
      setLocalStream(localStream);
    }
  }, [localStream, setLocalStream]);

  // Add local stream to audio analysis
  useEffect(() => {
    if (localStream) {
      addStream('local', localStream);
      return () => removeStream('local');
    }
  }, [localStream]); // Remove addStream and removeStream from dependencies

  // Handle new peer connections and disconnections
  useEffect(() => {
    if (!networkInfo) return; // Don't process until we have network info
    
    const currentConnectionIds = connections.map((conn: any) => conn.id);
    const currentPeerIds = peers.map(p => p.id);
    
    // Add new peers
    connections.forEach((connection: any) => {
      if (!currentPeerIds.includes(connection.id)) {
        const peerData: PeerData = {
          id: connection.id,
          stream: connection.stream,
          networkInfo: networkInfo,
          lastSeen: new Date()
        };
        
        addPeer(peerData);
        addStream(connection.id, connection.stream);
      }
    });

    // Remove disconnected peers
    peers.forEach(peer => {
      if (!currentConnectionIds.includes(peer.id)) {
        removePeer(peer.id);
        removeStream(peer.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionIds, networkInfo]); // Intentionally limited dependencies to prevent infinite loops

  // Update audio levels
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPeers = peersRef.current;
      const currentGetVolumeForStream = getVolumeForStreamRef.current;
      const currentUpdatePeerAudioLevel = updatePeerAudioLevelRef.current;
      
      currentPeers.forEach(peer => {
        const volumeData = currentGetVolumeForStream(peer.id);
        if (volumeData) {
          currentUpdatePeerAudioLevel(peer.id, volumeData.smoothedVolume);
        }
      });
    }, 100);

    return () => clearInterval(interval);
  }, []); // No dependencies - refs will always have current values

  // Enhanced call function that uses local stream
  const call = (targetPeerId: string) => {
    if (localStream) {
      peerCall(targetPeerId, localStream);
    } else {
      setError('No local stream available for calling');
    }
  };

  // Update loading state with more detailed logic
  useEffect(() => {
    const hasNetworkInfo = !networkLoading && networkInfo;
    const hasLocalStream = localStream !== null;
    const hasPeerId = peerId !== null;
    
    addDebugInfo(`Loading check - Network: ${hasNetworkInfo}, Stream: ${hasLocalStream}, Peer: ${hasPeerId}`);
    
    const hasAllRequiredData = hasNetworkInfo && hasLocalStream && hasPeerId;
    setIsLoading(!hasAllRequiredData);
  }, [networkLoading, networkInfo, localStream, peerId]);

  // Update error state with debug info
  useEffect(() => {
    const errors = [networkError, mediaError, peerError].filter(Boolean);
    if (errors.length > 0) {
      const errorMessage = errors.join(', ');
      setError(errorMessage);
      addDebugInfo(`Errors detected: ${errorMessage}`);
    } else {
      setError(null);
    }
  }, [networkError, mediaError, peerError]);

  const contextValue: PeerContextType = {
    // Network and grouping
    networkInfo,
    groups,
    peers,
    
    // Local media
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    
    // Peer connection
    peerId,
    isConnected,
    connections,
    call,
    
    // Audio analysis
    loudestStreamId,
    getVolumeForStream,
    
    // Loading and error states
    isLoading,
    error: error || (debugInfo.length > 0 ? `Debug: ${debugInfo.join(' | ')}` : null)
  };

  return (
    <PeerContext.Provider value={contextValue}>
      {children}
    </PeerContext.Provider>
  );
}
