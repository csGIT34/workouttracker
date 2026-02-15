import { useState, useEffect, useRef } from 'react';

// Generate a WAV blob containing a sine wave beep
function createBeepBlob(frequency: number, duration: number, volume: number): Blob {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate sine wave with fade in/out
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t * 50);
    const fadeOut = Math.min(1, (duration - t) * 50);
    const envelope = fadeIn * fadeOut;
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface StopwatchState {
  time: number;
  isRunning: boolean;
  targetTime: number | null;
}

export function useStopwatch() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const intervalRef = useRef<number>();
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const doneAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Create audio elements on mount
  useEffect(() => {
    try {
      const tickBlob = createBeepBlob(600, 0.15, 0.8);
      const doneBlob = createBeepBlob(900, 0.4, 1.0);

      const tickAudio = new Audio(URL.createObjectURL(tickBlob));
      const doneAudio = new Audio(URL.createObjectURL(doneBlob));

      // Preload
      tickAudio.load();
      doneAudio.load();

      tickAudioRef.current = tickAudio;
      doneAudioRef.current = doneAudio;
    } catch (e) {
      // Audio not available
    }

    return () => {
      if (tickAudioRef.current) {
        tickAudioRef.current.pause();
        URL.revokeObjectURL(tickAudioRef.current.src);
      }
      if (doneAudioRef.current) {
        doneAudioRef.current.pause();
        URL.revokeObjectURL(doneAudioRef.current.src);
      }
    };
  }, []);

  useEffect(() => {
    // Load saved state from localStorage
    const saved = localStorage.getItem('stopwatch');
    if (saved) {
      try {
        const { time: savedTime, isRunning: savedRunning, targetTime: savedTarget } = JSON.parse(saved);
        setTime(savedTime);
        setIsRunning(savedRunning);
        setTargetTime(savedTarget);
      } catch (e) {
        console.error('Failed to parse saved stopwatch state', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save state to localStorage
    localStorage.setItem('stopwatch', JSON.stringify({ time, isRunning, targetTime }));
  }, [time, isRunning, targetTime]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTime((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    // Auto-stop when countdown reaches 0
    if (targetTime !== null && time <= 0 && isRunning) {
      setIsRunning(false);
    }
  }, [time, targetTime, isRunning]);

  // Reactive sound playback when countdown reaches 3, 2, 1, 0
  useEffect(() => {
    if (!isRunning || targetTime === null) return;

    if (time === 3 || time === 2 || time === 1) {
      replayAudio(tickAudioRef.current);
    } else if (time === 0) {
      replayAudio(doneAudioRef.current);
    }
  }, [time, isRunning, targetTime]);

  // Replay an audio element from the beginning
  const replayAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (e) {
      // Playback failed
    }
  };

  // Unlock audio elements during a user gesture (required by iOS)
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;

    // Play and immediately pause to unlock on iOS
    const unlock = (audio: HTMLAudioElement | null) => {
      if (!audio) return;
      audio.volume = 0.01;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1.0;
      }).catch(() => {
        audio.volume = 1.0;
      });
    };

    unlock(tickAudioRef.current);
    unlock(doneAudioRef.current);
  };

  const start = () => setIsRunning(true);

  const pause = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setTime(0);
    setIsRunning(false);
    setTargetTime(null);
  };

  const startWithPreset = (seconds: number) => {
    // Unlock audio during this user gesture (tap/click)
    unlockAudio();

    setTime(seconds);
    setTargetTime(seconds);
    setIsRunning(true);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = targetTime ? ((targetTime - time) / targetTime) * 100 : 0;
  const isComplete = targetTime !== null && time <= 0;
  const isCountingDown = targetTime !== null && isRunning && time > 0;
  const isLastSeconds = isCountingDown && time <= 3;

  return {
    time,
    isRunning,
    targetTime,
    isComplete,
    isLastSeconds,
    start,
    pause,
    reset,
    startWithPreset,
    formatTime,
    progress,
  };
}
