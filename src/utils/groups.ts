// Group management utilities
import { generateGroupName } from './network';

export interface PeerData {
  id: string;
  stream: MediaStream;
  networkInfo: string;
  lastSeen: Date;
  audioLevel?: number;
  isLocal?: boolean;
}

export interface Group {
  id: string;
  name: string;
  peers: PeerData[];
  isLocal?: boolean;
  networkPrefix: string;
}

export class GroupManager {
  private peers: Map<string, PeerData> = new Map();
  private currentUserNetworkInfo: string = '';

  setCurrentUserNetwork(networkInfo: string) {
    this.currentUserNetworkInfo = networkInfo;
  }

  addPeer(peer: PeerData) {
    this.peers.set(peer.id, {
      ...peer,
      lastSeen: new Date()
    });
  }

  removePeer(peerId: string) {
    this.peers.delete(peerId);
  }

  updatePeerAudioLevel(peerId: string, audioLevel: number) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.audioLevel = audioLevel;
      peer.lastSeen = new Date();
    }
  }

  getPeer(peerId: string): PeerData | undefined {
    return this.peers.get(peerId);
  }

  getAllPeers(): PeerData[] {
    return Array.from(this.peers.values());
  }

  getGroups(): Group[] {
    const groupMap = new Map<string, Group>();

    // Add current user's group if we have network info
    if (this.currentUserNetworkInfo && !groupMap.has(this.currentUserNetworkInfo)) {
      groupMap.set(this.currentUserNetworkInfo, {
        id: this.currentUserNetworkInfo,
        name: generateGroupName(this.currentUserNetworkInfo),
        peers: [],
        isLocal: true,
        networkPrefix: this.currentUserNetworkInfo
      });
    }

    // Group all peers by network info
    this.peers.forEach(peer => {
      const groupId = peer.networkInfo;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          id: groupId,
          name: generateGroupName(groupId),
          peers: [],
          isLocal: groupId === this.currentUserNetworkInfo,
          networkPrefix: groupId
        });
      }
      
      groupMap.get(groupId)!.peers.push(peer);
    });

    // Sort groups - local group first, then by name
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getGroupByPeerId(peerId: string): Group | undefined {
    const peer = this.peers.get(peerId);
    if (!peer) return undefined;

    const groups = this.getGroups();
    return groups.find(group => group.peers.some(p => p.id === peerId));
  }

  getLoudestPeerInGroup(groupId: string): PeerData | undefined {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group || group.peers.length === 0) return undefined;

    return group.peers.reduce((loudest, peer) => {
      const currentLevel = peer.audioLevel || 0;
      const loudestLevel = loudest?.audioLevel || 0;
      return currentLevel > loudestLevel ? peer : loudest;
    }, group.peers[0]);
  }

  getOverallLoudestPeer(): PeerData | undefined {
    const allPeers = this.getAllPeers();
    if (allPeers.length === 0) return undefined;

    return allPeers.reduce((loudest, peer) => {
      const currentLevel = peer.audioLevel || 0;
      const loudestLevel = loudest?.audioLevel || 0;
      return currentLevel > loudestLevel ? peer : loudest;
    }, allPeers[0]);
  }

  // Clean up stale peers (not seen for more than 30 seconds)
  cleanupStalePeers() {
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const stalePeerIds: string[] = [];

    this.peers.forEach((peer, peerId) => {
      if (peer.lastSeen < thirtySecondsAgo) {
        stalePeerIds.push(peerId);
      }
    });

    stalePeerIds.forEach(peerId => {
      this.removePeer(peerId);
    });

    return stalePeerIds;
  }

  getGroupStats() {
    const groups = this.getGroups();
    return {
      totalGroups: groups.length,
      totalPeers: this.peers.size,
      groupsWithMultiplePeers: groups.filter(g => g.peers.length > 1).length,
      largestGroupSize: Math.max(...groups.map(g => g.peers.length), 0)
    };
  }
}
