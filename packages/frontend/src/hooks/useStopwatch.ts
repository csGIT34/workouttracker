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
  const playedSoundsRef = useRef<Set<number>>(new Set());

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

  // Countdown sounds at 3, 2, 1, 0
  useEffect(() => {
    if (!isRunning || targetTime === null) return;

    if (time <= 3 && time >= 1 && !playedSoundsRef.current.has(time)) {
      playedSoundsRef.current.add(time);
      playSound(600, 0.15, 0.7);
    }

    if (time <= 0 && !playedSoundsRef.current.has(0)) {
      playedSoundsRef.current.add(0);
      playSound(900, 0.4, 0.9);
    }
  }, [time, isRunning, targetTime]);

  const playSound = (frequency: number, duration: number, gain: number) => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      // Audio may not be available in all contexts
    }
  };

  const start = () => setIsRunning(true);

  const pause = () => setIsRunning(false);

  const reset = () => {
    setTime(0);
    setIsRunning(false);
    setTargetTime(null);
    playedSoundsRef.current.clear();
  };

  const startWithPreset = (seconds: number) => {
    setTime(seconds);
    setTargetTime(seconds);
    setIsRunning(true);
    playedSoundsRef.current.clear();
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
