import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioAnalyzer, VolumeSmoothing } from '@/utils/audio';

interface StreamVolume {
  streamId: string;
  volume: number;
  smoothedVolume: number;
}

interface UseLoudestMicrophoneResult {
  volumes: StreamVolume[];
  loudestStreamId: string | null;
  addStream: (streamId: string, stream: MediaStream) => void;
  removeStream: (streamId: string) => void;
  isAnalyzing: boolean;
}

export function useLoudestMicrophone(): UseLoudestMicrophoneResult {
  const [volumes, setVolumes] = useState<StreamVolume[]>([]);
  const [loudestStreamId, setLoudestStreamId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const smoothingRef = useRef<VolumeSmoothing | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamCountRef = useRef<number>(0); // Track stream count

  // Initialize analyzer and smoother
  useEffect(() => {
    analyzerRef.current = new AudioAnalyzer();
    smoothingRef.current = new VolumeSmoothing();

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.destroy();
      }
      if (smoothingRef.current) {
        smoothingRef.current.clear();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startAnalysis = useCallback(() => {
    if (intervalRef.current || !analyzerRef.current || !smoothingRef.current) {
      return;
    }

    setIsAnalyzing(true);
    
    intervalRef.current = setInterval(() => {
      if (!analyzerRef.current || !smoothingRef.current) return;

      const allVolumes = analyzerRef.current.getAllVolumes();
      const newVolumes: StreamVolume[] = [];
      let currentLoudestId: string | null = null;
      let currentLoudestVolume = 0;

      allVolumes.forEach((volume, streamId) => {
        // Add to smoothing
        smoothingRef.current!.addSample(streamId, volume);
        const smoothedVolume = smoothingRef.current!.getSmoothedVolume(streamId);

        newVolumes.push({
          streamId,
          volume,
          smoothedVolume
        });

        // Track loudest (using smoothed volume for more stable results)
        if (smoothedVolume > currentLoudestVolume && smoothedVolume > 0.01) {
          currentLoudestVolume = smoothedVolume;
          currentLoudestId = streamId;
        }
      });

      setVolumes(newVolumes);
      setLoudestStreamId(currentLoudestId);
    }, 200); // Update every 200ms
  }, []);

  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  const addStream = useCallback((streamId: string, stream: MediaStream) => {
    if (!analyzerRef.current) return;

    console.log('Adding stream for audio analysis:', streamId);
    analyzerRef.current.addStream(streamId, stream);
    streamCountRef.current += 1;

    // Start analysis if this is the first stream
    if (!intervalRef.current) {
      startAnalysis();
    }
  }, [startAnalysis]);

  const removeStream = useCallback((streamId: string) => {
    if (!analyzerRef.current || !smoothingRef.current) return;

    console.log('Removing stream from audio analysis:', streamId);
    analyzerRef.current.removeStream(streamId);
    streamCountRef.current = Math.max(0, streamCountRef.current - 1);

    // Remove from volumes
    setVolumes(prev => prev.filter(v => v.streamId !== streamId));

    // Clear loudest if it was this stream
    setLoudestStreamId(prev => prev === streamId ? null : prev);

    // Stop analysis if no more streams
    if (streamCountRef.current === 0) {
      stopAnalysis();
    }
  }, [stopAnalysis]); // Stable dependencies

  // Get volume for a specific stream
  const getVolumeForStream = useCallback((streamId: string): StreamVolume | undefined => {
    return volumes.find(v => v.streamId === streamId);
  }, [volumes]);

  // Get top N loudest streams
  const getTopLoudestStreams = useCallback((count: number = 3): StreamVolume[] => {
    return [...volumes]
      .filter(v => v.smoothedVolume > 0.01) // Filter out very quiet streams
      .sort((a, b) => b.smoothedVolume - a.smoothedVolume)
      .slice(0, count);
  }, [volumes]);

  return {
    volumes,
    loudestStreamId,
    addStream,
    removeStream,
    isAnalyzing,
    getVolumeForStream,
    getTopLoudestStreams
  } as UseLoudestMicrophoneResult & {
    getVolumeForStream: (streamId: string) => StreamVolume | undefined;
    getTopLoudestStreams: (count?: number) => StreamVolume[];
  };
}
