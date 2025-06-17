import { useState, useEffect, useCallback } from 'react';
import { GroupManager, Group, PeerData } from '@/utils/groups';

export function useGroups(networkInfo: string) {
  const [groupManager] = useState(() => new GroupManager());
  const [groups, setGroups] = useState<Group[]>([]);
  const [peers, setPeers] = useState<PeerData[]>([]);

  // Update group manager with current user's network info
  useEffect(() => {
    if (networkInfo) {
      groupManager.setCurrentUserNetwork(networkInfo);
      updateGroups();
    }
  }, [networkInfo, groupManager]);

  const updateGroups = useCallback(() => {
    const newGroups = groupManager.getGroups();
    const newPeers = groupManager.getAllPeers();
    setGroups(newGroups);
    setPeers(newPeers);
  }, [groupManager]);

  const addPeer = useCallback((peer: PeerData) => {
    groupManager.addPeer(peer);
    updateGroups();
  }, [groupManager, updateGroups]);

  const removePeer = useCallback((peerId: string) => {
    groupManager.removePeer(peerId);
    updateGroups();
  }, [groupManager, updateGroups]);

  const updatePeerAudioLevel = useCallback((peerId: string, audioLevel: number) => {
    groupManager.updatePeerAudioLevel(peerId, audioLevel);
    updateGroups();
  }, [groupManager, updateGroups]);

  const getPeer = useCallback((peerId: string) => {
    return groupManager.getPeer(peerId);
  }, [groupManager]);

  const getGroupByPeerId = useCallback((peerId: string) => {
    return groupManager.getGroupByPeerId(peerId);
  }, [groupManager]);

  const getLoudestPeerInGroup = useCallback((groupId: string) => {
    return groupManager.getLoudestPeerInGroup(groupId);
  }, [groupManager]);

  const getOverallLoudestPeer = useCallback(() => {
    return groupManager.getOverallLoudestPeer();
  }, [groupManager]);

  const cleanupStalePeers = useCallback(() => {
    const removedPeerIds = groupManager.cleanupStalePeers();
    if (removedPeerIds.length > 0) {
      updateGroups();
    }
    return removedPeerIds;
  }, [groupManager, updateGroups]);

  const getGroupStats = useCallback(() => {
    return groupManager.getGroupStats();
  }, [groupManager]);

  // Auto cleanup stale peers every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupStalePeers();
    }, 30000);

    return () => clearInterval(interval);
  }, [cleanupStalePeers]);

  return {
    groups,
    peers,
    addPeer,
    removePeer,
    updatePeerAudioLevel,
    getPeer,
    getGroupByPeerId,
    getLoudestPeerInGroup,
    getOverallLoudestPeer,
    cleanupStalePeers,
    getGroupStats
  };
}
