// Network detection and grouping logic
export async function detectNetworkInfo(): Promise<string> {
  console.log('[Network] Starting network detection...');
  
  try {
    // Method 1: Use WebRTC to get local IP with mobile-friendly timeout
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    return new Promise((resolve) => {
      let resolved = false;
      
      pc.onicecandidate = (event) => {
        if (event.candidate && !resolved) {
          const ip = extractIPFromCandidate(event.candidate.candidate);
          if (ip && !ip.startsWith('0.') && !ip.includes('::')) {
            console.log('[Network] Found IP via WebRTC:', ip);
            resolved = true;
            resolve(getNetworkPrefix(ip));
            pc.close();
          }
        }
      };
      
      pc.createDataChannel('');
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(err => {
          console.error('[Network] WebRTC offer failed:', err);
          if (!resolved) {
            resolved = true;
            getFallbackNetworkInfo().then(resolve);
          }
        });
      
      // Reduced timeout for mobile (3 seconds instead of 5)
      setTimeout(async () => {
        if (!resolved) {
          console.log('[Network] WebRTC timeout, using fallback...');
          resolved = true;
          try {
            pc.close();
            const fallbackInfo = await getFallbackNetworkInfo();
            resolve(fallbackInfo);
          } catch (error) {
            console.error('[Network] Fallback failed:', error);
            resolve('mobile-network');
          }
        }
      }, 3000);
    });
  } catch (error) {
    console.error('[Network] WebRTC method failed:', error);
    return getFallbackNetworkInfo();
  }
}

async function getFallbackNetworkInfo(): Promise<string> {
  try {
    // Try to detect if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile, try external IP but with shorter timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try {
        const response = await fetch('https://api.ipify.org?format=json', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const { ip } = await response.json();
        console.log('[Network] Got external IP:', ip);
        return getNetworkPrefix(ip);
      } catch (fetchError) {
        console.log('[Network] External IP failed, using mobile fallback');
        return 'mobile-network';
      }
    } else {
      const fallbackIP = await getFallbackIP();
      return getNetworkPrefix(fallbackIP);
    }
  } catch (error) {
    console.error('[Network] All fallback methods failed:', error);
    return 'unknown-network';
  }
}

function extractIPFromCandidate(candidate: string): string | null {
  const ipMatch = candidate.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
  return ipMatch ? ipMatch[0] : null;
}

async function getFallbackIP(): Promise<string> {
  const response = await fetch('https://api.ipify.org?format=json');
  const { ip } = await response.json();
  return ip;
}

function getNetworkPrefix(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    // For local networks, use first three octets
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    }
    // For public IPs, use first two octets for broader grouping
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return ip;
}

export function generateGroupName(networkPrefix: string): string {
  if (networkPrefix.startsWith('192.168.')) {
    return `Home Network (${networkPrefix})`;
  } else if (networkPrefix.startsWith('10.')) {
    return `Office Network (${networkPrefix})`;
  } else if (networkPrefix.startsWith('172.')) {
    return `Corporate Network (${networkPrefix})`;
  } else if (networkPrefix === 'mobile-network') {
    return 'Mobile Network';
  } else if (networkPrefix === 'unknown-network') {
    return 'Unknown Network';
  } else {
    return `Public Network (${networkPrefix})`;
  }
}
