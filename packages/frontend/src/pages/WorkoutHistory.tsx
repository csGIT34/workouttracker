import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkout } from '../contexts/WorkoutContext';
import { Workout, WorkoutStatus } from '@workout-tracker/shared';
import ConfirmModal from '../components/ConfirmModal';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const { getWorkouts, deleteWorkout } = useWorkout();

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      const { workouts: data } = await getWorkouts(50, 0);
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setWorkoutToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workoutToDelete) return;

    try {
      await deleteWorkout(workoutToDelete);
      setWorkouts(workouts.filter((w) => w.id !== workoutToDelete));
      setDeleteModalOpen(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (start: Date | string, end: Date | string | null) => {
    if (!end) return 'In progress';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 1000 / 60);
    return `${minutes} min`;
  };

  if (loading) {
    return <div>Loading workouts...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Workout History
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          View your past workouts and progress
        </p>
      </div>

      {workouts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No workouts yet
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Start Your First Workout
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {workouts.map((workout) => {
            const totalSets = workout.workoutExercises.reduce(
              (sum, ex) => sum + ex.sets.length,
              0
            );

            return (
              <div key={workout.id} className="card">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}>
                  <Link
                    to={workout.status === WorkoutStatus.IN_PROGRESS ? `/workout/${workout.id}` : `/workout/${workout.id}/details`}
                    style={{
                      flex: 1,
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {workout.name}
                      </h3>
                      {workout.status === WorkoutStatus.COMPLETED && (
                        <span className="badge badge-success">Completed</span>
                      )}
                      {workout.status === WorkoutStatus.IN_PROGRESS && (
                        <span className="badge badge-info">In Progress</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <div>{formatDate(workout.startedAt)}</div>
                      <div>{formatDuration(workout.startedAt, workout.completedAt)}</div>
                      <div>{workout.workoutExercises.length} exercises</div>
                      <div>{totalSets} sets</div>
                    </div>

                    {workout.workoutExercises.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {workout.workoutExercises
                            .map((ex) => ex.exercise?.name)
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      </div>
                    )}
                  </Link>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {workout.status === WorkoutStatus.IN_PROGRESS && (
                      <Link to={`/workout/${workout.id}`} className="btn btn-primary">
                        Continue
                      </Link>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteClick(workout.id);
                      }}
                      className="btn btn-outline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Workout Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Workout"
        message="Are you sure you want to delete this workout? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setWorkoutToDelete(null);
        }}
        danger={true}
      />
    </div>
  );
}
