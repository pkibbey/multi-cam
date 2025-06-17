import { useState, useEffect, useCallback } from 'react';

interface UseLocalMediaOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

interface UseLocalMediaResult {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  refreshStream: () => Promise<void>;
}

export function useLocalMedia(options: UseLocalMediaOptions = {}): UseLocalMediaResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const { video = true, audio = true } = options;

  const getMediaStream = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Detect if we're on mobile for optimized constraints
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Mobile-optimized media constraints
      const mobileVideoConstraints = {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 },
        facingMode: 'user'
      };

      const mobileAudioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      const constraints: MediaStreamConstraints = {
        video: video ? (isMobile ? mobileVideoConstraints : video) : false,
        audio: audio ? (isMobile ? mobileAudioConstraints : audio) : false
      };

      console.log(`[useLocalMedia] ${isMobile ? 'Mobile' : 'Desktop'} constraints:`, constraints);

      // Enhanced browser and context detection
      const userAgent = navigator.userAgent;
      const isSecureContext = window.isSecureContext;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHTTPS = window.location.protocol === 'https:';
      
      console.log('[useLocalMedia] Browser context:', {
        userAgent,
        isSecureContext,
        isLocalhost,
        isHTTPS,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      });

      // Check for various getUserMedia implementations
      let getUserMediaFunction = null;
      let errorDetails = [];

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getUserMediaFunction = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      } else if ((navigator as any).getUserMedia) {
        // Legacy API
        getUserMediaFunction = (constraints: MediaStreamConstraints) => {
          return new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).getUserMedia(constraints, resolve, reject);
          });
        };
      } else if ((navigator as any).webkitGetUserMedia) {
        // Webkit legacy
        getUserMediaFunction = (constraints: MediaStreamConstraints) => {
          return new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).webkitGetUserMedia(constraints, resolve, reject);
          });
        };
      } else if ((navigator as any).mozGetUserMedia) {
        // Firefox legacy
        getUserMediaFunction = (constraints: MediaStreamConstraints) => {
          return new Promise<MediaStream>((resolve, reject) => {
            (navigator as any).mozGetUserMedia(constraints, resolve, reject);
          });
        };
      }

      if (!getUserMediaFunction) {
        if (!navigator.mediaDevices) {
          errorDetails.push('navigator.mediaDevices is not available');
        }
        if (!isSecureContext && !isLocalhost) {
          errorDetails.push('Secure context (HTTPS) is required');
        }
        if (userAgent.includes('WebView')) {
          errorDetails.push('WebView detected - may not support getUserMedia');
        }
        
        const errorMessage = isMobile 
          ? `Camera/microphone not supported on this mobile browser. Details: ${errorDetails.join(', ')}`
          : `getUserMedia is not supported in this browser. Details: ${errorDetails.join(', ')}`;
        
        throw new Error(errorMessage);
      }

      const mediaStream = await getUserMediaFunction(constraints);
      
      console.log('[useLocalMedia] Media stream obtained:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length
      });

      setStream(mediaStream);
      
      // Set initial states based on tracks
      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];
      
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
      }
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
      }

      return mediaStream;
    } catch (err) {
      let errorMessage = 'Failed to access camera/microphone';
      
      console.error('[useLocalMedia] Error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera/microphone access denied. On mobile devices, ensure you\'re using HTTPS and grant permissions when prompted.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera/microphone found. Please connect a device and try again.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera/microphone is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera/microphone constraints not supported. Trying with fallback settings...';
          // Try fallback constraints for mobile
          try {
            const fallbackConstraints: MediaStreamConstraints = {
              video: video ? { facingMode: 'user' } : false,
              audio: audio ? true : false
            };
            const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            setStream(fallbackStream);
            setError(null);
            return fallbackStream;
          } catch (fallbackErr) {
            errorMessage = 'Camera/microphone not compatible with this device.';
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [video, audio]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  const refreshStream = useCallback(async () => {
    stopStream();
    await getMediaStream();
  }, [stopStream, getMediaStream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [stream]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [stream]);

  // Initialize media stream on mount
  useEffect(() => {
    getMediaStream().catch(() => {
      // Error is already handled in getMediaStream
    });

    // Cleanup on unmount
    return () => {
      stopStream();
    };
  }, []);

  // Update track states when stream changes
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
      }
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [stream]);

  return {
    stream,
    isLoading,
    error,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    refreshStream
  };
}
