import { useState } from 'react';
import { WorkoutExercise, ExerciseType } from '@workout-tracker/shared';
import { useWorkout } from '../contexts/WorkoutContext';

interface SetLoggerProps {
  workoutExercise: WorkoutExercise;
}

export default function SetLogger({ workoutExercise }: SetLoggerProps) {
  const isCardio = workoutExercise.exercise?.type === ExerciseType.CARDIO;
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const getInitialWeight = () => {
    if (workoutExercise.sets.length > 0) {
      const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1];
      return lastSet.weight || 0;
    }
    return workoutExercise.suggestedWeight || 0;
  };

  const getInitialDuration = () => {
    if (workoutExercise.sets.length > 0) {
      const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1];
      return lastSet.durationMinutes || 30;
    }
    return 30;
  };

  const getInitialDistance = () => {
    if (workoutExercise.sets.length > 0) {
      const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1];
      return lastSet.distanceMiles || 0;
    }
    return 0;
  };

  // Strength exercise state
  const [reps, setReps] = useState(workoutExercise.targetReps);
  const [weight, setWeight] = useState(getInitialWeight());
  const [rpe, setRpe] = useState<number | undefined>(undefined);

  // Cardio exercise state
  const [durationMinutes, setDurationMinutes] = useState(getInitialDuration());
  const [distanceMiles, setDistanceMiles] = useState(getInitialDistance());
  const [caloriesBurned, setCaloriesBurned] = useState<number | undefined>(undefined);

  const { logSet, updateSet } = useWorkout();

  const nextSetNumber = workoutExercise.sets.length + 1;

  // For cardio, only allow 1 set total
  const maxSets = isCardio ? 1 : workoutExercise.targetSets;

  const handleLogSet = async () => {
    try {
      if (isCardio) {
        await logSet(workoutExercise.id, {
          setNumber: nextSetNumber,
          durationMinutes,
          distanceMiles,
          caloriesBurned,
        });
        // Cardio is done after one set
      } else {
        await logSet(workoutExercise.id, {
          setNumber: nextSetNumber,
          reps,
          weight,
          rpe,
        });
        // Reset reps to target for next set, keep weight the same
        setReps(workoutExercise.targetReps);
        setRpe(undefined);
      }
    } catch (error) {
      console.error('Failed to log set:', error);
    }
  };

  const handleUpdateSet = async (setId: string, field: string, value: number) => {
    try {
      await updateSet(setId, { [field]: value });
    } catch (error) {
      console.error('Failed to update set:', error);
    }
  };

  return (
    <div>
      {workoutExercise.sets.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            {isCardio ? 'Activity Logged' : 'Completed Sets'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {workoutExercise.sets
              .sort((a, b) => a.setNumber - b.setNumber)
              .map((set) => {
                const isEditing = editingSetId === set.id;

                return (
                  <div
                    key={set.id}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      padding: '0.5rem',
                      backgroundColor: 'var(--background)',
                      borderRadius: '0.375rem',
                      border: isEditing ? '2px solid var(--primary)' : '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '40px' }}>
                      {isCardio ? '✓' : `#${set.setNumber}`}
                    </div>

                    {isEditing ? (
                      // Edit Mode
                      <>
                        {isCardio ? (
                          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="number"
                                className="input"
                                value={set.durationMinutes || 0}
                                onChange={(e) => handleUpdateSet(set.id, 'durationMinutes', Number(e.target.value))}
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: '100%' }}
                                placeholder="Minutes"
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                                minutes
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="number"
                                className="input"
                                value={set.distanceMiles || 0}
                                onChange={(e) => handleUpdateSet(set.id, 'distanceMiles', Number(e.target.value))}
                                step="0.1"
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: '100%' }}
                                placeholder="Miles"
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                                miles
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="number"
                                className="input"
                                value={set.caloriesBurned || ''}
                                onChange={(e) => handleUpdateSet(set.id, 'caloriesBurned', e.target.value ? Number(e.target.value) : 0)}
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: '100%' }}
                                placeholder="Calories"
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                                calories
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="number"
                                className="input"
                                value={set.reps || 0}
                                onChange={(e) => handleUpdateSet(set.id, 'reps', Number(e.target.value))}
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: '100%' }}
                                placeholder="Reps"
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                                reps
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="number"
                                className="input"
                                value={set.weight || 0}
                                onChange={(e) => handleUpdateSet(set.id, 'weight', Number(e.target.value))}
                                step="0.5"
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: '100%' }}
                                placeholder="Weight"
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                                lbs
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="number"
                                className="input"
                                value={set.rpe || ''}
                                onChange={(e) => handleUpdateSet(set.id, 'rpe', e.target.value ? Number(e.target.value) : 0)}
                                min={1}
                                max={10}
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: '100%' }}
                                placeholder="RPE"
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                                RPE (1-10)
                              </div>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setEditingSetId(null)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      // Display Mode
                      <>
                        {isCardio ? (
                          <div style={{ display: 'flex', gap: '1rem', flex: 1, fontSize: '0.875rem' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{set.durationMinutes || 0}</span>
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>min</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{set.distanceMiles || 0}</span>
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>mi</span>
                            </div>
                            {set.caloriesBurned && (
                              <div>
                                <span style={{ fontWeight: 600 }}>{set.caloriesBurned}</span>
                                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>cal</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '1rem', flex: 1, fontSize: '0.875rem' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{set.reps || 0}</span>
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>reps</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{set.weight || 0}</span>
                              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>lbs</span>
                            </div>
                            {set.rpe && (
                              <div>
                                <span style={{ fontWeight: 600 }}>RPE {set.rpe}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => setEditingSetId(set.id)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', whiteSpace: 'nowrap' }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {nextSetNumber <= maxSets && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--background)',
          borderRadius: '0.375rem',
        }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            {isCardio ? 'Log Activity' : `Log Set #${nextSetNumber}`}
          </h4>

          {isCardio ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Duration (min)
                </label>
                <input
                  type="number"
                  className="input"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min={0}
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Distance (mi)
                </label>
                <input
                  type="number"
                  className="input"
                  value={distanceMiles}
                  onChange={(e) => setDistanceMiles(Number(e.target.value))}
                  min={0}
                  step="0.1"
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Calories
                </label>
                <input
                  type="number"
                  className="input"
                  value={caloriesBurned || ''}
                  onChange={(e) => setCaloriesBurned(e.target.value ? Number(e.target.value) : undefined)}
                  min={0}
                  placeholder="Optional"
                  style={{ padding: '0.5rem' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Reps
                </label>
                <input
                  type="number"
                  className="input"
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                  min={0}
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  className="input"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  min={0}
                  step="0.5"
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                  RPE (1-10)
                </label>
                <input
                  type="number"
                  className="input"
                  value={rpe || ''}
                  onChange={(e) => setRpe(e.target.value ? Number(e.target.value) : undefined)}
                  min={1}
                  max={10}
                  placeholder="Optional"
                  style={{ padding: '0.5rem' }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleLogSet}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {isCardio ? 'Log Activity' : 'Log Set'}
          </button>
        </div>
      )}
    </div>
  );
}
