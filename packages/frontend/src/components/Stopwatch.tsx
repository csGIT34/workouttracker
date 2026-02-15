import { useStopwatch } from '../hooks/useStopwatch';

interface StopwatchProps {
  onComplete?: () => void;
}

export default function Stopwatch({ onComplete }: StopwatchProps) {
  const { time, isRunning, targetTime, isComplete, start, pause, reset, startWithPreset, formatTime, progress } = useStopwatch();

  const presets = [
    { label: '30s', seconds: 30 },
    { label: '1min', seconds: 60 },
    { label: '2min', seconds: 120 },
    { label: '3min', seconds: 180 },
  ];

  return (
    <div className="card" style={{
      background: isComplete ? '#d1fae5' : 'var(--surface)',
      transition: 'background-color 0.3s',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          color: isComplete ? '#065f46' : 'var(--text)',
        }}>
          {formatTime(time)}
        </div>
      </div>

      {targetTime && (
        <div style={{
          height: '4px',
          backgroundColor: 'var(--border)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}>
          <div style={{
            height: '100%',
            backgroundColor: isComplete ? '#10b981' : 'var(--primary)',
            width: `${progress}%`,
            transition: 'width 0.3s',
          }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => startWithPreset(preset.seconds)}
            className="btn btn-outline"
            style={{ flex: 1, minWidth: 'fit-content' }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!isRunning ? (
          <button onClick={start} className="btn btn-primary" style={{ flex: 1 }}>
            Start
          </button>
        ) : (
          <button onClick={pause} className="btn btn-secondary" style={{ flex: 1 }}>
            Pause
          </button>
        )}
        <button onClick={reset} className="btn btn-outline" style={{ flex: 1 }}>
          Reset
        </button>
      </div>
    </div>
  );
}
