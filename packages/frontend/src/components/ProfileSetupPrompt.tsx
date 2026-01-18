import { useState } from 'react';

interface ProfileSetupPromptProps {
  onSetupNow: () => void;
  onDismiss: () => void;
}

export default function ProfileSetupPrompt({ onSetupNow, onDismiss }: ProfileSetupPromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        maxWidth: '400px',
        backgroundColor: 'var(--surface)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '2px solid var(--primary)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔥</span>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
            Track Your Calories!
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        To track calories burned during your workouts, set your weight in your profile.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={handleDismiss}
          className="btn btn-outline"
          style={{ flex: 1 }}
        >
          Skip for Now
        </button>
        <button
          onClick={onSetupNow}
          className="btn"
          style={{
            flex: 1,
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
          }}
        >
          Set Up Now
        </button>
      </div>
    </div>
  );
}
