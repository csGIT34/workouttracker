import { useState, useEffect, useRef } from 'react';

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
  const audioContextRef = useRef<AudioContext | null>(null);
  // Silent oscillator that keeps AudioContext alive on iOS for the entire countdown
  const keepAliveOscRef = useRef<OscillatorNode | null>(null);

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

  // Reactive sound playback — plays sounds when countdown reaches 3, 2, 1, 0
  // The AudioContext is kept alive by the silent keep-alive oscillator started during user gesture
  useEffect(() => {
    if (!isRunning || targetTime === null) return;
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state !== 'running') return;

    if (time === 3 || time === 2 || time === 1) {
      playSound(ctx, 600, 0.15, 0.7);
    } else if (time === 0) {
      playSound(ctx, 900, 0.4, 0.9);
    }
  }, [time, isRunning, targetTime]);

  // Play a sound immediately on the given AudioContext
  const playSound = (ctx: AudioContext, frequency: number, duration: number, gainValue: number) => {
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(gainValue, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      // Audio playback failed
    }
  };

  // Stop the keep-alive oscillator
  const stopKeepAlive = () => {
    if (keepAliveOscRef.current) {
      try { keepAliveOscRef.current.stop(); } catch (e) { /* already stopped */ }
      keepAliveOscRef.current = null;
    }
  };

  const start = () => setIsRunning(true);

  const pause = () => {
    setIsRunning(false);
    stopKeepAlive();
  };

  const reset = () => {
    setTime(0);
    setIsRunning(false);
    setTargetTime(null);
    stopKeepAlive();
  };

  const startWithPreset = (seconds: number) => {
    stopKeepAlive();

    // Create/resume AudioContext during user gesture (required by all browsers)
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play a silent oscillator for the entire countdown duration.
      // This keeps the AudioContext in "running" state on iOS, which would
      // otherwise suspend it after a few seconds of no audio output.
      // The reactive useEffect above then plays audible sounds at 3, 2, 1, 0.
      const silentOsc = ctx.createOscillator();
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0; // completely silent
      silentOsc.connect(silentGain);
      silentGain.connect(ctx.destination);
      silentOsc.start();
      silentOsc.stop(ctx.currentTime + seconds + 2); // +2s buffer
      keepAliveOscRef.current = silentOsc;
    } catch (e) {
      // Web Audio not available
    }

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

  return {
    time,
    isRunning,
    targetTime,
    isComplete,
    start,
    pause,
    reset,
    startWithPreset,
    formatTime,
    progress,
  };
}
