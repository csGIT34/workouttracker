import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../contexts/WorkoutContext';
import api, { scheduleAPI, workoutAPI, analyticsAPI } from '../services/api';
import { WorkoutSchedule, PersonalRecord } from '@workout-tracker/shared';
import ActiveWorkoutModal from '../components/ActiveWorkoutModal';

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

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
}

interface VolumeComparison {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
}

interface MonthlySummary {
  totalVolume: number;
  averageDuration: number;
  workoutCount: number;
  topMuscleGroups: Array<{ name: string; count: number }>;
}

interface RecentActivity {
  id: string;
  name: string;
  completedAt: string;
  duration: number;
  volume: number;
  exerciseCount: number;
  highlights: string[];
}

export default function Dashboard() {
  const [workoutName, setWorkoutName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorkoutStats>({ totalWorkouts: 0, weekWorkouts: 0 });
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<WorkoutSchedule | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [todayCompletedWorkout, setTodayCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [volumeComparison, setVolumeComparison] = useState<VolumeComparison | null>(null);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WorkoutSchedule[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [activeWorkoutModalOpen, setActiveWorkoutModalOpen] = useState(false);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const { createWorkout } = useWorkout();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          statsRes,
          recentRes,
          scheduleRes,
          activeRes,
          streakRes,
          volumeCompRes,
          recentPRsRes,
          weeklyScheduleRes,
          monthlySummaryRes,
          recentActivityRes,
        ] = await Promise.all([
          api.get('/api/v1/workouts/stats'),
          api.get('/api/v1/workouts/recent'),
          scheduleAPI.getToday(),
          workoutAPI.getActive(),
          analyticsAPI.getStreak(),
          analyticsAPI.getVolumeComparison(),
          analyticsAPI.getRecentPRs(3),
          scheduleAPI.getWeekly(),
          analyticsAPI.getMonthlySummary(),
          analyticsAPI.getRecentActivity(5),
        ]);

        setStats(statsRes.data);
        setRecentWorkouts(recentRes.data);
        setTodaySchedule(scheduleRes.data);
        setActiveWorkout(activeRes.data);
        setStreak(streakRes.data);
        setVolumeComparison(volumeCompRes.data);
        setRecentPRs(recentPRsRes.data);
        setWeeklySchedule(weeklyScheduleRes.data);
        setMonthlySummary(monthlySummaryRes.data);
        setRecentActivity(recentActivityRes.data);

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

    // Check if there's already an active workout first
    const activeResponse = await workoutAPI.getActive();

    if (activeResponse.data) {
      const nameToUse = workoutName; // Capture in closure
      setActiveWorkoutId(activeResponse.data.id);

      // Store the action in ref
      pendingActionRef.current = async () => {
        const workout = await createWorkout({ name: nameToUse });
        navigate(`/workout/${workout.id}`);
      };

      setActiveWorkoutModalOpen(true);
      return;
    }

    // No active workout, create new one
    setLoading(true);
    try {
      const workout = await createWorkout({ name: workoutName });
      navigate(`/workout/${workout.id}`);
    } catch (error) {
      console.error('Failed to create workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string, templateName: string) => {
    // Check if there's already an active workout first
    const activeResponse = await workoutAPI.getActive();
    if (activeResponse.data) {
      setActiveWorkoutId(activeResponse.data.id);

      // Store the action in ref
      pendingActionRef.current = async () => {
        const response = await api.post('/api/v1/workouts/from-previous', {
          templateWorkoutId: templateId,
          name: `${templateName} - ${new Date().toLocaleDateString()}`,
        });
        navigate(`/workout/${response.data.id}`);
      };

      setActiveWorkoutModalOpen(true);
      return;
    }

    // No active workout, create new one
    setLoading(true);
    try {
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

  const handleResumeActiveWorkout = () => {
    if (activeWorkoutId) {
      navigate(`/workout/${activeWorkoutId}`);
    }
    setActiveWorkoutModalOpen(false);
    setActiveWorkoutId(null);
    pendingActionRef.current = null;
  };

  const handleCreateNewWorkout = async () => {
    setActiveWorkoutModalOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setActiveWorkoutId(null);

    if (action) {
      setLoading(true);
      try {
        await action();
      } catch (error) {
        console.error('Failed to create workout:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelActiveWorkoutModal = () => {
    setActiveWorkoutModalOpen(false);
    setActiveWorkoutId(null);
    pendingActionRef.current = null;
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

      {/* Stats Grid */}
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem' }}>
        {/* Workout Streak */}
        {streak && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔥</span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>Workout Streak</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {streak.currentStreak}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {streak.currentStreak === 1 ? 'day' : 'days'}
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Best: {streak.longestStreak} {streak.longestStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
        )}

        {/* Weekly Volume Comparison */}
        {volumeComparison && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📈</span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>Weekly Volume</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {Math.round(volumeComparison.thisWeek).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>lbs</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: volumeComparison.percentChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {volumeComparison.percentChange >= 0 ? '↑' : '↓'} {Math.abs(volumeComparison.percentChange).toFixed(1)}%
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>vs last week</span>
            </div>
          </div>
        )}

        {/* This Week Stats */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>This Week</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {stats.weekWorkouts}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>workouts</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Total: {stats.totalWorkouts} all-time
          </div>
        </div>

        {/* Monthly Summary */}
        {monthlySummary && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📅</span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>This Month</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Workouts:</span>
                <span style={{ fontWeight: 600 }}>{monthlySummary.workoutCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Avg Session:</span>
                <span style={{ fontWeight: 600 }}>{monthlySummary.averageDuration} min</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Volume:</span>
                <span style={{ fontWeight: 600 }}>{Math.round(monthlySummary.totalVolume).toLocaleString()} lbs</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '2rem' }}>
        {/* Start Workout */}
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

        {/* Recent PRs */}
        {recentPRs.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏆</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Recent PRs</h2>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentPRs.map((pr) => (
                <div
                  key={pr.exerciseId}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--background)',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{pr.exerciseName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {pr.maxWeight} lbs × {pr.reps} reps
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {new Date(pr.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Schedule */}
        {weeklySchedule.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📆</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>This Week's Schedule</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                const schedule = weeklySchedule.find(s => s.dayOfWeek === index);
                const today = new Date().getDay();
                const isToday = index === today;
                return (
                  <div
                    key={day}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: isToday ? 'var(--primary-bg)' : 'var(--background)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: isToday ? 600 : 400 }}>
                      {day}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: schedule ? 'var(--text)' : 'var(--text-secondary)' }}>
                      {schedule ? schedule.template?.name : 'Rest'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Recent Activity</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--background)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => navigate(`/workouts/${activity.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{activity.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(activity.completedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {activity.highlights.map((highlight, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {i === 0 && '💪'}
                      {i === 1 && '📊'}
                      {i === 2 && '⏱️'}
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Muscle Groups This Month */}
      {monthlySummary && monthlySummary.topMuscleGroups.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💪</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Top Muscle Groups This Month</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {monthlySummary.topMuscleGroups.map((group, index) => (
              <div
                key={group.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--background)',
                  borderRadius: '0.375rem',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{group.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {group.count} exercises
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Workout Warning Modal */}
      <ActiveWorkoutModal
        isOpen={activeWorkoutModalOpen}
        onResume={handleResumeActiveWorkout}
        onCreateNew={handleCreateNewWorkout}
        onCancel={handleCancelActiveWorkoutModal}
      />
    </div>
  );
}
