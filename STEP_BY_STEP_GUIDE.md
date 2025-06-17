# Step-by-Step Guide: Multi-Camera WebRTC App with PeerJS, React, Groups, and Loudest Microphone Detection

This guide will walk you through building a web application that allows multiple devices (phones, laptops, etc.) to join a shared room, stream their cameras, and view all video feeds in real time. The app will feature a grid view organized by groups and a loudest-microphone view, using PeerJS for WebRTC connections, React (with Shadcn UI components) for the frontend, and the Web Audio API for audio analysis.

**Key Features:**
- **Groups**: Video feeds are automatically organized by common information (e.g., IP address/network)
- **Grid View**: All videos displayed in a grouped layout
- **Microphone View**: Loudest speaker is featured, with groups maintained
- **Real-time Grouping**: Devices on the same network appear together

---

## 1. Project Setup

1. **Clone or create a new Next.js project**
   - You already have a Next.js project. If not:
     ```bash
     npx create-next-app@latest video-chat
     cd video-chat
     ```
2. **Install dependencies:**
   ```bash
   npm install peerjs socket.io-client shadcn-ui react-use
   npm install --save-dev @types/peerjs @types/socket.io-client
   ```
   - `peerjs`: WebRTC abstraction
   - `socket.io-client`: For signaling (PeerJS default server uses this)
   - `shadcn-ui`: Modern React UI components
   - `react-use`: Useful React hooks (optional)

3. **Set up Shadcn UI:**
   - Follow [Shadcn UI docs](https://ui.shadcn.com/docs/installation/next) to install and configure components.

---

## 2. Set Up PeerJS Signaling Server (on Render)

PeerJS requires a signaling server. For this project, you will deploy the PeerJS server to [Render](https://render.com/):

1. **Create a new Node.js Web Service on Render**
   - Repository: Use a simple repo with a `package.json` and a start script for PeerJS.
   - Example `package.json`:
     ```json
     {
       "name": "peerjs-server",
       "version": "1.0.0",
       "main": "server.js",
       "dependencies": {
         "peer": "^1.5.2"
       },
       "scripts": {
         "start": "node server.js"
       }
     }
     ```
   - Example `server.js`:
     ```js
     const { PeerServer } = require('peer');
     const server = PeerServer({ port: process.env.PORT || 9000, path: '/' });
     ```
   - Deploy this repo to Render as a Web Service.
   - Note the public URL Render provides (e.g., `https://your-peerjs-server.onrender.com`).

2. **Update your frontend to use this PeerJS server URL.**

---

## 2.1. Why Custom and Utility Hooks Are Useful

To keep the codebase clean, modular, and easy to maintain, this project will use a combination of utility hooks from the `react-use` library and custom hooks tailored to the app's needs. Here’s why these hooks are important:

- **useMediaStream / useLocalMedia**: Handles access to the user's camera and microphone, manages permissions, and provides the local media stream for display and sharing.
- **usePeer**: Manages PeerJS initialization, connection lifecycle, and peer events, abstracting away the complexity of WebRTC signaling.
- **usePeersMediaStreams**: Maintains a list of remote media streams from all connected peers, making it easy to render and update the video grid.
- **useGroups**: Organizes peers into groups based on common information (IP address, network), providing grouped data structures for UI rendering.
- **useLoudestMicrophone**: Uses the Web Audio API to analyze audio levels from all streams, allowing the UI to highlight the loudest mic in real time while maintaining group context.
- **useEvent / useUpdate / useList (from react-use)**: Simplifies event handling, state updates, and dynamic list management, reducing boilerplate and improving code readability.

By organizing logic into hooks, you ensure that each piece of functionality is reusable, testable, and easy to integrate into React components.

---

## 3. App Architecture

- **Single Room:** All devices join the same room (no room selection or codes needed).
- **Mesh network:** Each peer connects to all others.
- **Groups:** Peers are automatically organized into groups based on their network information (IP address).
- **UI:**
  - Grid view: All videos organized by groups, with group headers/separators
  - Microphone view: Loudest mic is featured, others are organized by groups in smaller thumbnails

---

## 3.1. Group Organization System

### How Groups Work:
1. **Automatic Detection**: When a peer connects, their IP address or network information is detected
2. **Group Assignment**: Peers with the same network/IP prefix are grouped together
3. **Dynamic Updates**: Groups update in real-time as peers join or leave
4. **Visual Organization**: UI displays groups with clear separators and labels

### Group Data Structure:
```typescript
interface Group {
  id: string;           // Unique identifier (e.g., IP prefix)
  name: string;         // Display name (e.g., "192.168.1.x Network")
  peers: PeerData[];    // Array of peers in this group
  isLocal?: boolean;    // True if this is the user's own group
}

interface PeerData {
  id: string;
  stream: MediaStream;
  networkInfo: string;  // IP address or network identifier
  lastSeen: Date;
  audioLevel?: number;  // For loudest mic detection
}
```

### Benefits:
- **Better Organization**: Easy to identify which devices are on the same network
- **Quick Overview**: See all cameras from a specific location at a glance
- **Troubleshooting**: Easier to identify network-related connectivity issues
- **Scalability**: Manageable UI even with many connected devices

---

## 4. Implementing the Frontend

### 4.1. Routing
- Use a single page (e.g., `/` or `/app`) for the video interface.

### 4.2. Network Detection and Group Assignment
- When a peer connects, detect their IP address or network information
- Use WebRTC's `RTCPeerConnection.getStats()` to gather network details
- Alternatively, use a simple IP detection service for initial grouping
- Group peers by network prefix (e.g., `192.168.1.x`, `10.0.0.x`)

### 4.3. PeerJS Integration with Group Metadata
- On page load:
  - Get user media (camera + mic)
  - Detect local network information
  - Connect to PeerJS server with group metadata
  - Discover and connect to all other peers
  - Exchange group information during peer handshake
  - Display all video streams organized by groups

### 4.4. Video Grid UI with Groups
- Use Shadcn UI components for layout
- Render groups as sections with headers
- Within each group, render video elements for each peer
- Add visual separators between groups
- Show group labels (e.g., "Home Network", "Office WiFi")

### 4.5. Loudest Microphone Detection with Group Context
- For each incoming stream, use the Web Audio API to analyze volume
- Periodically (e.g., every 200ms), determine which stream is loudest
- Update the UI to feature the loudest stream while maintaining group organization
- In microphone view: featured speaker + grouped thumbnails for others

---

## 5. Example File Structure

```
src/
  app/
    page.tsx   # Main app logic
  components/
    VideoGrid.tsx      # Grid view with group organization
    GroupedVideos.tsx  # Component for rendering grouped video streams
    GroupHeader.tsx    # Group label and metadata display
    MicrophoneView.tsx # Featured speaker + grouped thumbnails
    PeerProvider.tsx   # PeerJS context logic
  utils/
    audio.ts           # Audio analysis helpers
    network.ts         # Network detection and grouping logic
    groups.ts          # Group management utilities
  hooks/
    useGroups.ts       # Custom hook for group management
    useNetworkInfo.ts  # Hook for detecting network information
```

---

## 6. Implementing the Group System

### 6.1. Network Detection
```typescript
// utils/network.ts
export async function detectNetworkInfo(): Promise<string> {
  try {
    // Method 1: Use WebRTC to get local IP
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    return new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const ip = extractIPFromCandidate(event.candidate.candidate);
          if (ip) {
            resolve(getNetworkPrefix(ip));
          }
        }
      };
      
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
    });
  } catch (error) {
    // Fallback: Use external IP service
    const response = await fetch('https://api.ipify.org?format=json');
    const { ip } = await response.json();
    return getNetworkPrefix(ip);
  }
}

function getNetworkPrefix(ip: string): string {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}
```

### 6.2. Group Management Hook
```typescript
// hooks/useGroups.ts
export function useGroups(peers: PeerData[]) {
  const [groups, setGroups] = useState<Group[]>([]);
  
  useEffect(() => {
    const groupMap = new Map<string, Group>();
    
    peers.forEach(peer => {
      const groupId = peer.networkInfo;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          id: groupId,
          name: `Network ${groupId}`,
          peers: [],
          isLocal: groupId === currentUserGroup
        });
      }
      
      groupMap.get(groupId)!.peers.push(peer);
    });
    
    setGroups(Array.from(groupMap.values()));
  }, [peers]);
  
  return { groups };
}
```

### 6.3. Grouped Video Grid Component
```typescript
// components/GroupedVideos.tsx
export function GroupedVideos({ groups }: { groups: Group[] }) {
  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.id} className="group-section">
          <GroupHeader group={group} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {group.peers.map(peer => (
              <VideoTile key={peer.id} peer={peer} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Deployment

- Deploy your Next.js app (Vercel)
- Deploy your PeerJS server (Render)
- Update frontend to use your PeerJS server URL
- Ensure proper STUN/TURN server configuration for network detection across different networks

---

## 8. Optional Enhancements

- Add screen sharing
- Add chat or text overlay
- Add custom group names/labels ("Kitchen", "Living Room", etc.)
- Add mute/hide controls per group or individual peer
- Add group-level controls (mute all in group, hide group)
- Add network quality indicators per group
- Add automatic group detection based on geolocation
- Add manual group assignment override

---

## 9. References

- [PeerJS Docs](https://peerjs.com/docs.html)
- [Shadcn UI Docs](https://ui.shadcn.com/docs)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Next.js Docs](https://nextjs.org/docs)
- [Render Node.js Web Service Guide](https://render.com/docs/deploy-node)

---

You are now ready to start building! Continue to the next steps to scaffold the code and implement each feature.
