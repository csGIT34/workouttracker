import { useEffect } from 'react';

interface ActiveWorkoutModalProps {
  isOpen: boolean;
  onResume: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export default function ActiveWorkoutModal({
  isOpen,
  onResume,
  onCreateNew,
  onCancel,
}: ActiveWorkoutModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          maxWidth: '28rem',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.75rem',
            color: 'var(--text)',
          }}
        >
          Active Workout in Progress
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: '1.5',
          }}
        >
          You already have a workout in progress. Would you like to resume it or start a new one?
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onResume();
            }}
            className="btn"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
            }}
          >
            Resume Active Workout
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateNew();
            }}
            className="btn btn-outline"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
            }}
          >
            Create New Workout Anyway
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
