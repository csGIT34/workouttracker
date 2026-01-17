import { useState } from 'react';
import { WorkoutExercise, ExerciseType, WorkoutStatus } from '@workout-tracker/shared';
import { useWorkout } from '../contexts/WorkoutContext';
import SetLogger from './SetLogger';

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  workoutId: string;
}

export default function WorkoutExerciseCard({ workoutExercise, workoutId }: WorkoutExerciseCardProps) {
  const [expanded, setExpanded] = useState(true);
  const { completeExercise, currentWorkout } = useWorkout();

  const isCardio = workoutExercise.exercise?.type === ExerciseType.CARDIO;
  const completedSets = workoutExercise.sets.filter((s) => s.completed).length;
  const targetSets = isCardio ? 1 : workoutExercise.targetSets;
  const progressPercent = (completedSets / targetSets) * 100;

  // Allow editing if workout is not completed
  const workoutCompleted = currentWorkout?.status === WorkoutStatus.COMPLETED;

  const handleComplete = async () => {
    if (completedSets < targetSets) {
      const message = isCardio
        ? 'Activity not logged yet. Mark as complete anyway?'
        : `Only ${completedSets} of ${targetSets} sets completed. Mark as complete anyway?`;
      if (!confirm(message)) {
        return;
      }
    }

    try {
      await completeExercise(workoutId, workoutExercise.id);
      // Auto-collapse after marking complete
      setExpanded(false);
    } catch (error) {
      console.error('Failed to complete exercise:', error);
    }
  };

  return (
    <div className="card" style={{
      borderLeft: workoutExercise.completed ? '4px solid var(--success)' : '4px solid var(--primary)',
    }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: expanded ? '1rem' : 0,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
            {workoutExercise.exercise?.name}
            {workoutExercise.completed && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>✓</span>
            )}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {isCardio ? (
              <>
                {completedSets > 0 ? 'Activity logged' : 'Target: '}
                {workoutExercise.targetDurationMinutes && `${workoutExercise.targetDurationMinutes} min`}
                {workoutExercise.targetDistanceMiles && ` • ${workoutExercise.targetDistanceMiles} mi`}
              </>
            ) : (
              <>
                {completedSets} / {workoutExercise.targetSets} sets • {workoutExercise.targetReps} reps target
                {workoutExercise.suggestedWeight && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                    • Suggested: {Math.round(workoutExercise.suggestedWeight)} lbs
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <>
          <div
            style={{
              height: '4px',
              backgroundColor: 'var(--border)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--success)',
                width: `${progressPercent}%`,
                transition: 'width 0.3s',
              }}
            />
          </div>

          {/* Show SetLogger as long as workout is not completed */}
          {!workoutCompleted && (
            <SetLogger workoutExercise={workoutExercise} />
          )}

          {/* Show complete button only if exercise is not completed and workout is not completed */}
          {!workoutExercise.completed && !workoutCompleted && (
            <button
              onClick={handleComplete}
              className="btn btn-success"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Mark Exercise Complete
            </button>
          )}

          {/* Show message if workout is completed */}
          {workoutCompleted && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.375rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              Workout completed - sets cannot be edited
            </div>
          )}
        </>
      )}
    </div>
  );
}
