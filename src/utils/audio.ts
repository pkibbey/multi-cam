// Audio analysis helpers for loudest microphone detection
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyzers: Map<string, AnalyserNode> = new Map();
  private volumes: Map<string, number> = new Map();
  private isRunning = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  addStream(streamId: string, stream: MediaStream) {
    if (!this.audioContext || !stream.getAudioTracks().length) {
      return;
    }

    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyzer = this.audioContext.createAnalyser();
      
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.3;
      
      source.connect(analyzer);
      this.analyzers.set(streamId, analyzer);
      this.volumes.set(streamId, 0);

      if (!this.isRunning) {
        this.startAnalysis();
      }
    } catch (error) {
      console.error('Failed to add stream for analysis:', error);
    }
  }

  removeStream(streamId: string) {
    this.analyzers.delete(streamId);
    this.volumes.delete(streamId);

    if (this.analyzers.size === 0) {
      this.stopAnalysis();
    }
  }

  private startAnalysis() {
    this.isRunning = true;
    this.analyzeVolumes();
  }

  private stopAnalysis() {
    this.isRunning = false;
  }

  private analyzeVolumes() {
    if (!this.isRunning) return;

    this.analyzers.forEach((analyzer, streamId) => {
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volume = rms / 255; // Normalize to 0-1

      this.volumes.set(streamId, volume);
    });

    // Continue analysis
    requestAnimationFrame(() => this.analyzeVolumes());
  }

  getVolume(streamId: string): number {
    return this.volumes.get(streamId) || 0;
  }

  getAllVolumes(): Map<string, number> {
    return new Map(this.volumes);
  }

  getLoudestStream(): { streamId: string; volume: number } | null {
    if (this.volumes.size === 0) return null;

    let loudestId = '';
    let loudestVolume = 0;

    this.volumes.forEach((volume, streamId) => {
      if (volume > loudestVolume) {
        loudestVolume = volume;
        loudestId = streamId;
      }
    });

    return loudestVolume > 0.01 ? { streamId: loudestId, volume: loudestVolume } : null;
  }

  destroy() {
    this.stopAnalysis();
    this.analyzers.clear();
    this.volumes.clear();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Helper function to get volume threshold for "speaking" detection
export function getVolumeThreshold(): number {
  return 0.01; // Adjust based on testing
}

// Helper function to smooth volume changes to avoid rapid switching
export class VolumeSmoothing {
  private history: Map<string, number[]> = new Map();
  private readonly historySize = 5; // Number of samples to average

  addSample(streamId: string, volume: number) {
    if (!this.history.has(streamId)) {
      this.history.set(streamId, []);
    }
    
    const samples = this.history.get(streamId)!;
    samples.push(volume);
    
    // Keep only recent samples
    if (samples.length > this.historySize) {
      samples.shift();
    }
  }

  getSmoothedVolume(streamId: string): number {
    const samples = this.history.get(streamId);
    if (!samples || samples.length === 0) return 0;
    
    // Calculate weighted average (more recent samples have higher weight)
    let weightedSum = 0;
    let totalWeight = 0;
    
    samples.forEach((sample, index) => {
      const weight = index + 1; // Later samples get higher weight
      weightedSum += sample * weight;
      totalWeight += weight;
    });
    
    return weightedSum / totalWeight;
  }

  clear() {
    this.history.clear();
  }
}
