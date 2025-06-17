# Multi-Camera WebRTC Video Chat Application

A real-time video chat application built with Next.js, PeerJS, React, and shadcn/ui that allows multiple devices to connect and stream video in organized groups based on network location.

## Features

- **Multi-Device Support**: Connect phones, laptops, tablets, and other devices
- **Network-Based Grouping**: Automatically groups devices by network (e.g., same WiFi)
- **Grid View**: See all video feeds organized by groups
- **Speaker View**: Featured view for the loudest speaker with group thumbnails
- **Real-time Audio Analysis**: Detects and highlights the loudest microphone
- **Responsive Design**: Works on all screen sizes
- **Easy Connection**: Simple peer ID sharing for device connection

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Modern web browser with WebRTC support
- Camera and microphone access

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd video-chat
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Allow permissions**: Grant camera and microphone access when prompted
2. **Share your Peer ID**: Copy your unique peer ID from the interface
3. **Connect devices**: 
   - Open the app on multiple devices
   - On each device, allow camera/mic access
   - Copy the peer ID from one device
   - Paste it into the "Connect to another device" field on another device
   - Click "Connect"
4. **Switch views**: Toggle between Grid View and Speaker View using the buttons

## How It Works

### Network Grouping
- Devices are automatically grouped by their network information
- Local network devices (same WiFi) appear in the same group
- Groups are labeled (e.g., "Home Network", "Office Network")

### Audio Analysis
- Real-time microphone level detection using Web Audio API
- Loudest speaker is automatically highlighted
- Volume indicators show speaking activity
- Smoothed audio levels prevent rapid switching

### Peer-to-Peer Connection
- Uses PeerJS for WebRTC abstraction
- Mesh network topology (each peer connects to all others)
- Automatic reconnection handling
- Built-in fallback to public PeerJS server

## Views

### Grid View
- All video feeds displayed in a grid
- Organized by network groups
- Group headers show network information
- Collapsible group sections

### Speaker View
- Featured large view for the loudest speaker
- Grouped thumbnails for other participants
- Maintains group organization in sidebar
- Automatic switching based on audio levels

## Technical Architecture

### Core Technologies
- **Next.js 15**: React framework with App Router
- **PeerJS**: WebRTC wrapper for peer-to-peer connections
- **shadcn/ui**: Modern UI components
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development

### Key Components
- `PeerProvider`: Context for managing peer connections and state
- `VideoGrid`: Main layout component with view switching
- `GroupedVideos`: Grid view with network-based grouping
- `MicrophoneView`: Speaker-focused view
- `VideoTile`: Individual video stream component

### Custom Hooks
- `useNetworkInfo`: Detects local network information
- `useGroups`: Manages peer grouping logic
- `useLocalMedia`: Handles camera/microphone access
- `usePeer`: Manages PeerJS connection lifecycle
- `useLoudestMicrophone`: Real-time audio analysis

## Deployment

### For Production

1. Deploy to Vercel (recommended):
```bash
npm run build
# Deploy to Vercel
```

2. Or deploy to any hosting platform that supports Next.js

### Custom PeerJS Server (Optional)

For better reliability, you can deploy your own PeerJS signaling server:

1. Create a simple Node.js server:
```javascript
const { PeerServer } = require('peer');
const server = PeerServer({ 
  port: process.env.PORT || 9000, 
  path: '/' 
});
```

2. Deploy to Render, Railway, or similar
3. Update the `PeerProvider` to use your server URL

## Browser Compatibility

- Chrome 70+
- Firefox 63+
- Safari 14+
- Edge 79+
- Mobile browsers with WebRTC support

## Troubleshooting

### Camera/Microphone Issues
- Ensure permissions are granted
- Check if other apps are using the camera
- Try refreshing the page
- Restart the browser

### Connection Issues
- Check internet connectivity
- Firewall may block WebRTC traffic
- Try from different networks
- Use a VPN if corporate firewall blocks connections

### Audio Detection Issues
- Ensure microphone is not muted
- Check browser audio permissions
- Test with different microphones
- Adjust microphone sensitivity in OS settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [PeerJS](https://peerjs.com/) for WebRTC abstraction
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Next.js](https://nextjs.org/) team for the framework
