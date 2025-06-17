import { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { MediaConnection } from 'peerjs';

interface PeerConnection {
  id: string;
  connection: MediaConnection;
  stream: MediaStream;
}

interface UsePeerOptions {
  host?: string;
  port?: number;
  path?: string;
  key?: string;
}

interface UsePeerResult {
  peer: Peer | null;
  peerId: string | null;
  connections: PeerConnection[];
  isConnected: boolean;
  error: string | null;
  call: (targetPeerId: string, stream: MediaStream) => void;
  disconnect: () => void;
}

export function usePeer(options: UsePeerOptions = {}): UsePeerResult {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<PeerConnection[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const connectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Default to PeerJS cloud server, but allow custom server
  const peerOptions = {
    // Use default PeerJS cloud server for now
    // host: options.host || 'peerjs-server.herokuapp.com',
    // port: options.port || 443,
    // path: options.path || '/',
    // secure: true,
    ...options
  };

  const initializePeer = useCallback(() => {
    try {
      setError(null);
      
      const newPeer = new Peer(peerOptions);
      
      newPeer.on('open', (id) => {
        console.log('Peer connected with ID:', id);
        setPeerId(id);
        setIsConnected(true);
      });

      newPeer.on('error', (err) => {
        console.error('Peer error:', err);
        let errorMessage = 'Peer connection error';
        
        if (err.type === 'browser-incompatible') {
          errorMessage = 'Browser not supported';
        } else if (err.type === 'disconnected') {
          errorMessage = 'Disconnected from peer server';
        } else if (err.type === 'invalid-id') {
          errorMessage = 'Invalid peer ID';
        } else if (err.type === 'invalid-key') {
          errorMessage = 'Invalid API key';
        } else if (err.type === 'network') {
          errorMessage = 'Network error - unable to connect to peer server';
        } else if (err.type === 'peer-unavailable') {
          errorMessage = 'Peer not available';
        } else if (err.type === 'ssl-unavailable') {
          errorMessage = 'SSL not available';
        } else if (err.type === 'server-error') {
          errorMessage = 'Server error';
        } else if (err.type === 'socket-error') {
          errorMessage = 'Socket error';
        } else if (err.type === 'socket-closed') {
          errorMessage = 'Socket closed';
        } else if (err.type === 'unavailable-id') {
          errorMessage = 'ID already taken';
        } else if (err.type === 'webrtc') {
          errorMessage = 'WebRTC error';
        }
        
        setError(errorMessage);
        setIsConnected(false);
      });

      newPeer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        
        // Answer the call with local stream if available
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
        } else {
          // If no local stream, answer with empty stream
          call.answer();
        }

        call.on('stream', (remoteStream) => {
          console.log('Received remote stream from:', call.peer);
          const newConnection: PeerConnection = {
            id: call.peer,
            connection: call,
            stream: remoteStream
          };
          
          connectionsRef.current.set(call.peer, call);
          setConnections(prev => [...prev.filter(c => c.id !== call.peer), newConnection]);
        });

        call.on('close', () => {
          console.log('Call closed with:', call.peer);
          connectionsRef.current.delete(call.peer);
          setConnections(prev => prev.filter(c => c.id !== call.peer));
        });

        call.on('error', (err) => {
          console.error('Call error with', call.peer, ':', err);
          connectionsRef.current.delete(call.peer);
          setConnections(prev => prev.filter(c => c.id !== call.peer));
        });
      });

      newPeer.on('close', () => {
        console.log('Peer connection closed');
        setIsConnected(false);
        setPeerId(null);
        setConnections([]);
        connectionsRef.current.clear();
      });

      newPeer.on('disconnected', () => {
        console.log('Peer disconnected');
        setIsConnected(false);
      });

      setPeer(newPeer);
      
    } catch (err) {
      console.error('Failed to initialize peer:', err);
      setError('Failed to initialize peer connection');
    }
  }, [peerOptions]);

  const call = useCallback((targetPeerId: string, stream: MediaStream) => {
    if (!peer || !isConnected) {
      console.error('Peer not connected');
      return;
    }

    try {
      console.log('Calling peer:', targetPeerId);
      const call = peer.call(targetPeerId, stream);
      
      call.on('stream', (remoteStream) => {
        console.log('Received remote stream from:', targetPeerId);
        const newConnection: PeerConnection = {
          id: targetPeerId,
          connection: call,
          stream: remoteStream
        };
        
        connectionsRef.current.set(targetPeerId, call);
        setConnections(prev => [...prev.filter(c => c.id !== targetPeerId), newConnection]);
      });

      call.on('close', () => {
        console.log('Call closed with:', targetPeerId);
        connectionsRef.current.delete(targetPeerId);
        setConnections(prev => prev.filter(c => c.id !== targetPeerId));
      });

      call.on('error', (err) => {
        console.error('Call error with', targetPeerId, ':', err);
        connectionsRef.current.delete(targetPeerId);
        setConnections(prev => prev.filter(c => c.id !== targetPeerId));
      });

    } catch (err) {
      console.error('Failed to call peer:', err);
    }
  }, [peer, isConnected]);

  const disconnect = useCallback(() => {
    if (peer) {
      connectionsRef.current.forEach(connection => {
        connection.close();
      });
      connectionsRef.current.clear();
      
      peer.destroy();
      setPeer(null);
      setPeerId(null);
      setConnections([]);
      setIsConnected(false);
    }
  }, [peer]);

  // Store local stream reference for answering calls
  const setLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
  }, []);

  // Initialize peer on mount
  useEffect(() => {
    initializePeer();
    
    return () => {
      disconnect();
    };
  }, []);

  return {
    peer,
    peerId,
    connections,
    isConnected,
    error,
    call,
    disconnect,
    setLocalStream
  } as UsePeerResult & { setLocalStream: (stream: MediaStream | null) => void };
}
