import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkout } from '../contexts/WorkoutContext';
import { Exercise, WorkoutExercise } from '@workout-tracker/shared';
import Stopwatch from '../components/Stopwatch';
import ExerciseSelector from '../components/ExerciseSelector';
import WorkoutExerciseCard from '../components/WorkoutExerciseCard';
import SaveAsTemplateModal from '../components/SaveAsTemplateModal';
import ConfirmModal from '../components/ConfirmModal';

export default function ActiveWorkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkout, getWorkout, completeWorkout, deleteWorkout, saveWorkoutAsTemplate } = useWorkout();
  const [loading, setLoading] = useState(true);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
  const [completedWorkoutData, setCompletedWorkoutData] = useState<{ id: string; name: string; templateId: string | null } | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkout();
    }
  }, [id]);

  const loadWorkout = async () => {
    if (!id) return;

    setLoading(true);
    try {
      await getWorkout(id);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWorkout = async () => {
    if (!currentWorkout) return;
    setCompleteModalOpen(false);

    try {
      // Store workout data before completing
      const workoutData = {
        id: currentWorkout.id,
        name: currentWorkout.name,
        templateId: currentWorkout.templateId || null,
      };
      const hasExercises = currentWorkout.workoutExercises.length > 0;

      // Complete the workout
      await completeWorkout(currentWorkout.id);

      // Check if we should show the save as template modal
      // Only show for ad-hoc workouts (templateId === null) with exercises
      if (workoutData.templateId === null && hasExercises) {
        setCompletedWorkoutData(workoutData);
        setShowSaveAsTemplateModal(true);
      } else {
        // Navigate directly to history if template-based or empty workout
        navigate('/history');
      }
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!currentWorkout) return;
    setDeleteModalOpen(false);

    try {
      await deleteWorkout(currentWorkout.id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  };

  const handleSaveAsTemplate = async (data: { name: string; description?: string; color?: string }) => {
    if (!completedWorkoutData) return;

    try {
      await saveWorkoutAsTemplate(completedWorkoutData.id, data);
      setShowSaveAsTemplateModal(false);
      setCompletedWorkoutData(null);
      navigate('/history');
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error; // Re-throw so modal can handle error display
    }
  };

  const handleSkipSaveAsTemplate = () => {
    setShowSaveAsTemplateModal(false);
    setCompletedWorkoutData(null);
    navigate('/history');
  };

  if (loading) {
    return <div>Loading workout...</div>;
  }

  // If showing save as template modal, render it even if currentWorkout is null
  if (showSaveAsTemplateModal && completedWorkoutData) {
    return (
      <SaveAsTemplateModal
        workoutName={completedWorkoutData.name}
        onSave={handleSaveAsTemplate}
        onSkip={handleSkipSaveAsTemplate}
        onClose={handleSkipSaveAsTemplate}
      />
    );
  }

  if (!currentWorkout) {
    return <div>Workout not found</div>;
  }

  const startTime = new Date(currentWorkout.startedAt);
  const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {currentWorkout.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Started {elapsedMinutes} minutes ago
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setDeleteModalOpen(true)} className="btn btn-outline">
            Cancel
          </button>
          <button onClick={() => setCompleteModalOpen(true)} className="btn btn-success">
            Complete Workout
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 350px' }}>
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              Exercises
            </h2>
            <button
              onClick={() => setShowExerciseSelector(true)}
              className="btn btn-primary"
            >
              + Add Exercise
            </button>
          </div>

          {currentWorkout.workoutExercises.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No exercises added yet
              </p>
              <button
                onClick={() => setShowExerciseSelector(true)}
                className="btn btn-primary"
              >
                Add Your First Exercise
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentWorkout.workoutExercises
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((workoutExercise) => (
                  <WorkoutExerciseCard
                    key={workoutExercise.id}
                    workoutExercise={workoutExercise}
                    workoutId={currentWorkout.id}
                  />
                ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Rest Timer
          </h2>
          <Stopwatch />
        </div>
      </div>

      {showExerciseSelector && (
        <ExerciseSelector
          workoutId={currentWorkout.id}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}

      {/* Complete Workout Confirmation Modal */}
      <ConfirmModal
        isOpen={completeModalOpen}
        title="Complete Workout"
        message="Are you sure you want to complete this workout?"
        confirmText="Complete"
        cancelText="Cancel"
        onConfirm={handleCompleteWorkout}
        onCancel={() => setCompleteModalOpen(false)}
        danger={false}
      />

      {/* Delete Workout Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Cancel Workout"
        message="Are you sure you want to cancel and delete this workout? This cannot be undone."
        confirmText="Delete"
        cancelText="Keep Workout"
        onConfirm={handleDeleteWorkout}
        onCancel={() => setDeleteModalOpen(false)}
        danger={true}
      />
    </div>
  );
}
