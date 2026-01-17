import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../contexts/WorkoutContext';
import api, { scheduleAPI, workoutAPI } from '../services/api';
import { WorkoutSchedule } from '@workout-tracker/shared';

interface WorkoutStats {
  totalWorkouts: number;
  weekWorkouts: number;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface RecentWorkout {
  id: string;
  name: string;
  completedAt: string;
  workoutExercises: Array<{
    exercise: Exercise;
  }>;
}

interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: string;
}

interface CompletedWorkout {
  id: string;
  name: string;
  completedAt: string;
  workoutExercises: Array<{
    exercise: {
      name: string;
    };
  }>;
}

export default function Dashboard() {
  const [workoutName, setWorkoutName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorkoutStats>({ totalWorkouts: 0, weekWorkouts: 0 });
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<WorkoutSchedule | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [todayCompletedWorkout, setTodayCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const { createWorkout } = useWorkout();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes, scheduleRes, activeRes] = await Promise.all([
          api.get('/api/v1/workouts/stats'),
          api.get('/api/v1/workouts/recent'),
          scheduleAPI.getToday(),
          workoutAPI.getActive(),
        ]);
        setStats(statsRes.data);
        setRecentWorkouts(recentRes.data);
        setTodaySchedule(scheduleRes.data);
        setActiveWorkout(activeRes.data);

        // Check if today's scheduled workout was completed
        if (scheduleRes.data?.templateId) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const workoutsRes = await api.get('/api/v1/workouts', {
            params: { limit: 50 }
          });

          const completedToday = workoutsRes.data.workouts?.find((w: any) => {
            if (!w.completedAt || w.templateId !== scheduleRes.data.templateId) return false;
            const completedDate = new Date(w.completedAt);
            return completedDate >= todayStart && completedDate <= todayEnd;
          });

          setTodayCompletedWorkout(completedToday || null);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;

    setLoading(true);
    try {
      // Check if there's already an active workout
      const activeResponse = await workoutAPI.getActive();
      if (activeResponse.data) {
        if (confirm('You have an active workout. Resume it instead of creating a new one?')) {
          navigate(`/workout/${activeResponse.data.id}`);
          return;
        }
      }

      const workout = await createWorkout({ name: workoutName });
      navigate(`/workout/${workout.id}`);
    } catch (error) {
      console.error('Failed to create workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string, templateName: string) => {
    setLoading(true);
    try {
      // Check if there's already an active workout
      const activeResponse = await workoutAPI.getActive();
      if (activeResponse.data) {
        if (confirm('You have an active workout. Resume it instead of creating a new one?')) {
          navigate(`/workout/${activeResponse.data.id}`);
          return;
        }
      }

      const response = await api.post('/api/v1/workouts/from-previous', {
        templateWorkoutId: templateId,
        name: `${templateName} - ${new Date().toLocaleDateString()}`,
      });
      navigate(`/workout/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create workout from template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTodayWorkout = async () => {
    setLoading(true);
    try {
      // If there's an active workout, resume it
      if (activeWorkout) {
        navigate(`/workout/${activeWorkout.id}`);
        return;
      }

      // Create new workout from template
      if (!todaySchedule?.templateId) return;
      const response = await workoutAPI.createFromTemplate(todaySchedule.templateId);
      navigate(`/workout/${response.data.id}`);
    } catch (error) {
      console.error('Failed to start today\'s workout:', error);
      alert('Failed to start workout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Start a new workout or view your history
        </p>
      </div>

      {(activeWorkout || todaySchedule || todayCompletedWorkout) && (
        <div className="card" style={{
          marginBottom: '2rem',
          backgroundColor: todayCompletedWorkout ? '#6366f1' : (activeWorkout ? '#10b981' : (todaySchedule?.template?.color || '#3b82f6')),
          color: 'white'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {todayCompletedWorkout ? "Today's Workout Complete! ✓" : (activeWorkout ? 'Workout In Progress' : "Today's Workout")}
          </h2>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            {todayCompletedWorkout ? todayCompletedWorkout.name : (activeWorkout ? activeWorkout.name : todaySchedule?.template?.name)}
          </h3>
          <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
            {todayCompletedWorkout
              ? `Completed at ${new Date(todayCompletedWorkout.completedAt).toLocaleTimeString()}`
              : (activeWorkout
                ? `Started ${new Date(activeWorkout.startedAt).toLocaleTimeString()}`
                : `${todaySchedule?.template?.templateExercises?.length || 0} exercises planned`)
            }
          </p>
          {todayCompletedWorkout ? (
            <button
              onClick={() => navigate(`/workouts/${todayCompletedWorkout.id}`)}
              className="btn"
              style={{
                backgroundColor: 'white',
                color: '#6366f1',
                fontWeight: 'bold',
              }}
            >
              View Workout Details
            </button>
          ) : (
            <button
              onClick={handleStartTodayWorkout}
              disabled={loading}
              className="btn"
              style={{
                backgroundColor: 'white',
                color: activeWorkout ? '#10b981' : (todaySchedule?.template?.color || '#3b82f6'),
                fontWeight: 'bold',
              }}
            >
              {loading ? (activeWorkout ? 'Resuming...' : 'Starting...') : (activeWorkout ? 'Resume Workout' : 'Start Workout')}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Start New Workout
          </h2>

          <form onSubmit={handleCreateWorkout}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Workout Name
              </label>
              <input
                type="text"
                className="input"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g., Push Day, Leg Day"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Creating...' : 'Start Workout'}
            </button>
          </form>

          {recentWorkouts.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                Recent Workouts (Click to Repeat)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentWorkouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => handleUseTemplate(workout.id, workout.name)}
                    className="btn btn-outline"
                    disabled={loading}
                    style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{workout.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {workout.workoutExercises.map(we => we.exercise.name).slice(0, 3).join(', ')}
                        {workout.workoutExercises.length > 3 && ` +${workout.workoutExercises.length - 3} more`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Quick Stats
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.375rem',
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                This Week
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {stats.weekWorkouts}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Workouts completed
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.375rem',
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Total
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {stats.totalWorkouts}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                All time workouts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
