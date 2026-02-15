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
  // Track scheduled oscillators so we can cancel them on pause/reset
  const scheduledOscillatorsRef = useRef<OscillatorNode[]>([]);

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

  // Vibration fallback for mobile (works from timer callbacks unlike Web Audio on iOS)
  useEffect(() => {
    if (!isRunning || targetTime === null) return;
    if (!navigator.vibrate) return;

    if (time === 3 || time === 2 || time === 1) {
      navigator.vibrate(100); // Short buzz for countdown
    } else if (time === 0) {
      navigator.vibrate([200, 100, 200, 100, 300]); // Long pattern for completion
    }
  }, [time, isRunning, targetTime]);

  // Cancel all scheduled sounds
  const cancelScheduledSounds = () => {
    for (const osc of scheduledOscillatorsRef.current) {
      try { osc.stop(); } catch (e) { /* already stopped */ }
    }
    scheduledOscillatorsRef.current = [];
  };

  // Schedule a sound at an exact future time using Web Audio API timing
  const scheduleSound = (
    ctx: AudioContext,
    startAt: number,
    frequency: number,
    duration: number,
    gainValue: number
  ) => {
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(gainValue, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + duration);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration);

      scheduledOscillatorsRef.current.push(oscillator);
    } catch (e) {
      // Audio scheduling failed
    }
  };

  const start = () => setIsRunning(true);

  const pause = () => {
    setIsRunning(false);
    cancelScheduledSounds();
  };

  const reset = () => {
    setTime(0);
    setIsRunning(false);
    setTargetTime(null);
    cancelScheduledSounds();
  };

  const startWithPreset = (seconds: number) => {
    // Cancel any previously scheduled sounds
    cancelScheduledSounds();

    // Create/resume AudioContext during user gesture (required by all browsers)
    let ctx: AudioContext | null = null;
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      // Web Audio not available
    }

    // Pre-schedule all countdown sounds from within this user gesture
    // This is the only reliable way to play sounds on iOS
    if (ctx) {
      const now = ctx.currentTime;
      // Tick sounds at 3, 2, 1 seconds remaining
      if (seconds > 3) scheduleSound(ctx, now + (seconds - 3), 600, 0.15, 0.7);
      if (seconds > 2) scheduleSound(ctx, now + (seconds - 2), 600, 0.15, 0.7);
      if (seconds > 1) scheduleSound(ctx, now + (seconds - 1), 600, 0.15, 0.7);
      // Completion sound at 0
      scheduleSound(ctx, now + seconds, 900, 0.4, 0.9);
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
