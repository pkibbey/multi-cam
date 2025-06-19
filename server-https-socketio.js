const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 4000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
};

const ROOM = 'main-room';

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store peerId to socket mapping
  const peers = new Map();

  io.on('connection', (socket) => {
    socket.on('join-room', (peerId) => {
      peers.set(socket.id, peerId);
      socket.join(ROOM);
      // Notify the new peer of all others
      const peerList = Array.from(peers.values()).filter(id => id !== peerId);
      socket.emit('peer-list', peerList);
      // Notify others of the new peer
      socket.to(ROOM).emit('peer-joined', peerId);
    });

    socket.on('disconnect', () => {
      const peerId = peers.get(socket.id);
      peers.delete(socket.id);
      socket.to(ROOM).emit('peer-left', peerId);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`🚀 HTTPS server + Socket.IO ready`);
    console.log('📋 Make sure your mobile device is on the same network');
  });
});
