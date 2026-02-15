import { Exercise } from '@workout-tracker/shared';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  onClose: () => void;
}

const difficultyColors: Record<string, { bg: string; color: string }> = {
  BEGINNER: { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' },
  INTERMEDIATE: { bg: 'rgba(245, 158, 11, 0.1)', color: 'rgb(245, 158, 11)' },
  ADVANCED: { bg: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' },
};

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }
    if (parsed.hostname === 'youtu.be') {
      return `https://www.youtube-nocookie.com/embed${parsed.pathname}`;
    }
  } catch {
    // invalid URL
  }
  return null;
}

export default function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const secondaryMuscles = parseJsonArray(exercise.secondaryMuscles);
  const aliases = parseJsonArray(exercise.aliases);
  const embedUrl = exercise.videoUrl ? getYouTubeEmbedUrl(exercise.videoUrl) : null;
  const difficulty = exercise.difficulty as string | undefined;

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
        style={{
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {exercise.name}
            </h2>
            {aliases.length > 0 && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Also known as: {aliases.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: exercise.type === 'STRENGTH' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: exercise.type === 'STRENGTH' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
          }}>
            {exercise.type === 'STRENGTH' ? 'Strength' : 'Cardio'}
          </span>
          {difficulty && difficultyColors[difficulty] && (
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: difficultyColors[difficulty].bg,
              color: difficultyColors[difficulty].color,
            }}>
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </span>
          )}
          {exercise.force && (
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: 'rgb(139, 92, 246)',
            }}>
              {exercise.force.charAt(0) + exercise.force.slice(1).toLowerCase()}
            </span>
          )}
          {exercise.mechanic && (
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: 'rgb(99, 102, 241)',
            }}>
              {exercise.mechanic.charAt(0) + exercise.mechanic.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {/* Description */}
        {exercise.description && (
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}>
            {exercise.description}
          </p>
        )}

        {/* Muscle Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {exercise.muscleGroup && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.5rem',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Primary Muscle
              </div>
              <div style={{ fontWeight: 500 }}>
                {exercise.muscleGroup.name.charAt(0) + exercise.muscleGroup.name.slice(1).toLowerCase()}
                {exercise.specificMuscle && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block' }}>
                    {exercise.specificMuscle}
                  </span>
                )}
              </div>
            </div>
          )}
          {exercise.category && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.5rem',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Equipment
              </div>
              <div style={{ fontWeight: 500 }}>
                {exercise.category.name.charAt(0) + exercise.category.name.slice(1).toLowerCase()}
              </div>
            </div>
          )}
        </div>

        {/* Secondary Muscles */}
        {secondaryMuscles.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Secondary Muscles
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {secondaryMuscles.map((muscle) => (
                <span
                  key={muscle}
                  style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Video */}
        {embedUrl && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Video Tutorial
            </div>
            <div style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}>
              <iframe
                src={embedUrl}
                title={`${exercise.name} tutorial`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        {exercise.instructions && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Instructions
            </div>
            <p style={{
              color: 'var(--text)',
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}>
              {exercise.instructions}
            </p>
          </div>
        )}

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.5rem 2rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
