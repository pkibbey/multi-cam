#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting up HTTPS development server for mobile testing...\n');

// Check if mkcert is installed
try {
  execSync('mkcert -version', { stdio: 'ignore' });
  console.log('✅ mkcert is already installed');
} catch (error) {
  console.log('❌ mkcert not found. Installing...');
  try {
    // Try to install mkcert
    if (process.platform === 'darwin') {
      execSync('brew install mkcert', { stdio: 'inherit' });
    } else {
      console.log('Please install mkcert manually:');
      console.log('- macOS: brew install mkcert');
      console.log('- Windows: choco install mkcert');
      console.log('- Linux: https://github.com/FiloSottile/mkcert#installation');
      process.exit(1);
    }
  } catch (installError) {
    console.error('Failed to install mkcert:', installError.message);
    process.exit(1);
  }
}

// Create certificates directory
const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
  console.log('📁 Created certs directory');
}

// Generate certificates
try {
  execSync('mkcert -install', { stdio: 'inherit' });
  console.log('🔒 Installed root CA');
  
  // Get local IP for mobile testing
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'localhost';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }
  
  const certCommand = `mkcert -key-file ${path.join(certsDir, 'key.pem')} -cert-file ${path.join(certsDir, 'cert.pem')} localhost 127.0.0.1 ${localIP}`;
  execSync(certCommand, { stdio: 'inherit' });
  console.log(`🔐 Generated certificates for localhost and ${localIP}`);
  
} catch (error) {
  console.error('Failed to generate certificates:', error.message);
  process.exit(1);
}

// Create HTTPS development script
const httpsDevScript = `
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces for mobile access
const port = process.env.PORT || 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(\`🚀 HTTPS server ready on https://localhost:\${port}\`);
      console.log(\`📱 Mobile access: https://\${require('os').networkInterfaces().en0?.find(i => i.family === 'IPv4')?.address || 'YOUR_LOCAL_IP'}:\${port}\`);
      console.log('📋 Make sure your mobile device is on the same network');
    });
});
`;

fs.writeFileSync(path.join(__dirname, '..', 'server-https.js'), httpsDevScript);
console.log('📝 Created HTTPS development server script');

// Update package.json with HTTPS script
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts['dev:https']) {
  packageJson.scripts['dev:https'] = 'node server-https.js';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('📦 Added dev:https script to package.json');
}

console.log('\n✅ Setup complete!');
console.log('\n🎯 Next steps:');
console.log('1. Run: npm run dev:https');
console.log('2. Open https://localhost:3001 in your browser');
console.log('3. Accept the security warning (this is normal for local development)');
console.log('4. Access the same URL from your mobile device on the same network');
console.log('5. If you have issues, visit /debug page for diagnostics');
console.log('\n📱 Mobile Testing Tips:');
console.log('- Make sure your phone is on the same WiFi network');
console.log('- You may need to accept security warnings on mobile too');
console.log('- Use the /debug page to check mobile compatibility');
