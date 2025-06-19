const { PeerServer } = require('peer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 9000;
const HOST = '0.0.0.0';
const CERTS_DIR = path.join(__dirname, 'certs');

const options = {
  key: fs.readFileSync(path.join(CERTS_DIR, 'key.pem')),
  cert: fs.readFileSync(path.join(CERTS_DIR, 'cert.pem')),
};

const server = https.createServer(options);

PeerServer({
  port: PORT,
  path: '/',
  server,
});

server.listen(PORT, HOST, () => {
  console.log(`🔒 Secure PeerJS server running at https://192.168.1.207:${PORT}`);
});
