import { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { io, Socket } from 'socket.io-client';
import { Card } from '@/components/ui/card';
import { PEER_SERVER, SOCKET_SERVER } from '@/config/network';

const ROOM = 'main-room';

export default function Home() {
  const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
  const [peerId, setPeerId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let destroyed = false;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      if (destroyed) return;
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // Init PeerJS
      const peer = new Peer({
        host: PEER_SERVER.host,
        port: PEER_SERVER.port,
        path: PEER_SERVER.path,
        secure: PEER_SERVER.secure,
      });
      peerInstance.current = peer;
      peer.on('open', id => {
        setPeerId(id);
        // Connect to Socket.IO for peer discovery
        const socket = io(SOCKET_SERVER, { transports: ['websocket'], secure: true });
        socketRef.current = socket;
        socket.emit('join-room', id);
        socket.on('peer-list', (peerList: string[]) => {
          peerList.filter(pid => pid !== id).forEach(pid => {
            const call = peer.call(pid, stream);
            call?.on('stream', remoteStream => {
              setPeers(prev => ({ ...prev, [pid]: remoteStream }));
            });
          });
        });
        socket.on('peer-joined', (pid: string) => {
          if (pid !== id) {
            const call = peer.call(pid, stream);
            call?.on('stream', remoteStream => {
              setPeers(prev => ({ ...prev, [pid]: remoteStream }));
            });
          }
        });
        socket.on('peer-left', (pid: string) => {
          setPeers(prev => {
            const copy = { ...prev };
            delete copy[pid];
            return copy;
          });
        });
      });
      // Answer incoming calls
      peer.on('call', call => {
        call.answer(stream);
        call.on('stream', remoteStream => {
          setPeers(prev => ({ ...prev, [call.peer]: remoteStream }));
        });
      });
    });
    return () => {
      destroyed = true;
      peerInstance.current?.destroy();
      localStream.current?.getTracks().forEach(track => track.stop());
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Video Chat Room</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center p-2">
          <video ref={localVideoRef} autoPlay muted playsInline className="rounded w-full aspect-video bg-black" />
          <span className="mt-2 font-medium">You {peerId && <span className="text-xs text-neutral-500">({peerId})</span>}</span>
        </Card>
        {Object.entries(peers).map(([id, stream]) => (
          <Card key={id} className="flex flex-col items-center p-2">
            <VideoPlayer stream={stream} />
            <span className="mt-2 text-xs text-neutral-500">{id}</span>
          </Card>
        ))}
      </div>
    </main>
  );
}

function VideoPlayer({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="rounded w-full aspect-video bg-black" />;
}
