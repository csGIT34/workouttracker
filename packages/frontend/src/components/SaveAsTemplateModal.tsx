import { useState } from 'react';

interface SaveAsTemplateModalProps {
  workoutName: string;
  onSave: (data: { name: string; description?: string; color?: string }) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
}

export default function SaveAsTemplateModal({
  workoutName,
  onSave,
  onSkip,
  onClose
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(workoutName);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

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
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '500px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Save as Template
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Save this workout as a template so you can reuse it later.
        </p>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #ef4444',
              borderRadius: '0.375rem',
              color: '#dc2626',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="template-name"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Template Name *
          </label>
          <input
            id="template-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter template name"
            disabled={loading}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="template-description"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Description (optional)
          </label>
          <textarea
            id="template-description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this template"
            rows={3}
            disabled={loading}
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="template-color"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Color (optional)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              id="template-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={loading}
              style={{
                width: '60px',
                height: '40px',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {color}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSkip}
            className="btn btn-outline"
            style={{ flex: 1 }}
            disabled={loading}
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!name.trim() || loading}
          >
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
