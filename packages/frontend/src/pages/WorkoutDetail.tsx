import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWorkout } from '../contexts/WorkoutContext';
import { Workout, WorkoutStatus } from '@workout-tracker/shared';

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getWorkout } = useWorkout();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadWorkout();
    }
  }, [id]);

  const loadWorkout = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getWorkout(id);
      setWorkout(data);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: Date | string, end: Date | string | null) => {
    if (!end) return 'In progress';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return <div>Loading workout...</div>;
  }

  if (!workout) {
    return <div>Workout not found</div>;
  }

  const totalSets = workout.workoutExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = workout.workoutExercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0),
    0
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Link to="/history" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            ← Back to History
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {workout.name}
              </h1>
              {workout.status === WorkoutStatus.COMPLETED && (
                <span className="badge badge-success">Completed</span>
              )}
              {workout.status === WorkoutStatus.IN_PROGRESS && (
                <span className="badge badge-info">In Progress</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {formatDate(workout.startedAt)} • {formatDuration(workout.startedAt, workout.completedAt)}
            </p>
          </div>

          {workout.status === WorkoutStatus.IN_PROGRESS && (
            <Link to={`/workout/${workout.id}`} className="btn btn-primary">
              Continue Workout
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Exercises
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {workout.workoutExercises.length}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Total Sets
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {totalSets}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Total Volume
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {Math.round(totalVolume).toLocaleString()} lbs
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {workout.workoutExercises
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((workoutExercise) => (
            <div key={workoutExercise.id} className="card">
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {workoutExercise.exercise?.name}
                      {workoutExercise.completed && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--success)' }}>✓</span>
                      )}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Target: {workoutExercise.targetSets} sets × {workoutExercise.targetReps} reps
                      {workoutExercise.suggestedWeight && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          • Suggested: {Math.round(workoutExercise.suggestedWeight)} lbs
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {workoutExercise.exercise?.muscleGroup}
                  </div>
                </div>
              </div>

              {workoutExercise.sets.length > 0 ? (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 1fr 1fr 1fr',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div>SET</div>
                    <div>REPS</div>
                    <div>WEIGHT</div>
                    <div>RPE</div>
                    <div>VOLUME</div>
                  </div>

                  {workoutExercise.sets
                    .sort((a, b) => a.setNumber - b.setNumber)
                    .map((set) => (
                      <div
                        key={set.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr 1fr 1fr 1fr',
                          gap: '0.5rem',
                          padding: '0.75rem 0.5rem',
                          fontSize: '0.875rem',
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: set.completed ? 'transparent' : 'var(--background)',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>#{set.setNumber}</div>
                        <div>{set.reps}</div>
                        <div>{set.weight} lbs</div>
                        <div>
                          {set.rpe ? (
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              backgroundColor: 'var(--primary-bg)',
                              color: 'var(--primary)',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}>
                              {set.rpe}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>-</span>
                          )}
                        </div>
                        <div style={{ fontWeight: 500 }}>
                          {Math.round(set.weight * set.reps)} lbs
                        </div>
                      </div>
                    ))}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 1fr 1fr 1fr',
                    gap: '0.5rem',
                    padding: '0.75rem 0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--background)',
                  }}>
                    <div>Total</div>
                    <div>{workoutExercise.sets.reduce((sum, s) => sum + s.reps, 0)}</div>
                    <div>{Math.round(workoutExercise.sets.reduce((sum, s) => sum + s.weight, 0) / workoutExercise.sets.length)} lbs avg</div>
                    <div>
                      {workoutExercise.sets.some(s => s.rpe) ? (
                        <span>
                          {(workoutExercise.sets.filter(s => s.rpe).reduce((sum, s) => sum + (s.rpe || 0), 0) /
                            workoutExercise.sets.filter(s => s.rpe).length).toFixed(1)} avg
                        </span>
                      ) : (
                        '-'
                      )}
                    </div>
                    <div>
                      {Math.round(workoutExercise.sets.reduce((sum, s) => sum + s.weight * s.reps, 0))} lbs
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No sets logged for this exercise
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
