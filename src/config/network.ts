// Centralized configuration for network addresses

export const LAN_IP = '192.168.1.207';
export const PEER_SERVER = {
  host: LAN_IP,
  port: 9000,
  path: '/',
  secure: true,
};
export const SOCKET_SERVER = `https://${LAN_IP}:4000`;
