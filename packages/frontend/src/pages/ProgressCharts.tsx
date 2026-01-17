import { useState, useEffect } from 'react';
import { analyticsAPI, progressionAPI, templateAPI } from '../services/api';
import api from '../services/api';
import { Exercise, ExerciseType, PersonalRecord, WorkoutTemplate } from '@workout-tracker/shared';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ConfirmModal from '../components/ConfirmModal';

// Color palette for multiple exercises
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export default function ProgressCharts() {
  const [viewMode, setViewMode] = useState<'single' | 'template'>('single');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<string>('3months');
  const [progressionData, setProgressionData] = useState<any>(null);
  const [multiExerciseData, setMultiExerciseData] = useState<any>(null);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetAllModalOpen, setResetAllModalOpen] = useState(false);
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);

  useEffect(() => {
    fetchExercises();
    fetchTemplates();
    fetchVolumeData();
    fetchPersonalRecords();
  }, []);

  useEffect(() => {
    if (viewMode === 'single' && selectedExercise) {
      fetchProgressionData();
    } else if (viewMode === 'template' && selectedTemplate) {
      fetchMultiExerciseData();
    }
  }, [selectedExercise, selectedTemplate, selectedRange, viewMode]);

  const fetchExercises = async () => {
    try {
      const response = await api.get('/api/v1/exercises');
      const exerciseData = response.data.filter(
        (e: Exercise) => e.type === ExerciseType.STRENGTH
      );
      setExercises(exerciseData);
      if (exerciseData.length > 0) {
        setSelectedExercise(exerciseData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await templateAPI.getAll(false);
      const templateData = response.data;
      setTemplates(templateData);
      if (templateData.length > 0) {
        setSelectedTemplate(templateData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchProgressionData = async () => {
    if (!selectedExercise) return;

    try {
      const response = await analyticsAPI.getExerciseProgression(
        selectedExercise,
        selectedRange
      );
      setProgressionData(response.data);
    } catch (error) {
      console.error('Failed to fetch progression data:', error);
    }
  };

  const fetchMultiExerciseData = async () => {
    if (!selectedTemplate) return;

    try {
      // Get the template with exercises
      const templateResponse = await templateAPI.getById(selectedTemplate);
      const template = templateResponse.data;

      if (!template.templateExercises || template.templateExercises.length === 0) {
        setMultiExerciseData({ exercises: [], mergedData: [] });
        return;
      }

      // Filter to only strength exercises
      const strengthExercises = template.templateExercises.filter(
        (te: any) => te.exercise?.type === ExerciseType.STRENGTH
      );

      if (strengthExercises.length === 0) {
        setMultiExerciseData({ exercises: [], mergedData: [] });
        return;
      }

      // Fetch progression data for each exercise
      const progressionPromises = strengthExercises.map((te: any) =>
        analyticsAPI.getExerciseProgression(te.exerciseId, selectedRange)
          .then(res => ({
            exerciseId: te.exerciseId,
            exerciseName: te.exercise.name,
            data: res.data.data
          }))
          .catch(err => {
            console.error(`Failed to fetch data for ${te.exercise.name}:`, err);
            return {
              exerciseId: te.exerciseId,
              exerciseName: te.exercise.name,
              data: []
            };
          })
      );

      const allProgressionData = await Promise.all(progressionPromises);

      // Merge all data points by date
      const dateMap = new Map<string, any>();

      allProgressionData.forEach((exerciseData, index) => {
        exerciseData.data.forEach((point: any) => {
          const dateKey = new Date(point.date).toISOString().split('T')[0];

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { date: point.date });
          }

          const entry = dateMap.get(dateKey);
          entry[`${exerciseData.exerciseName}_maxWeight`] = point.maxWeight;
        });
      });

      // Convert to array and sort by date
      const mergedData = Array.from(dateMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setMultiExerciseData({
        exercises: allProgressionData.map((d, i) => ({
          id: d.exerciseId,
          name: d.exerciseName,
          color: CHART_COLORS[i % CHART_COLORS.length]
        })),
        mergedData
      });
    } catch (error) {
      console.error('Failed to fetch multi-exercise data:', error);
      setMultiExerciseData({ exercises: [], mergedData: [] });
    }
  };

  const fetchVolumeData = async () => {
    try {
      const response = await analyticsAPI.getVolumeByWeek(12);
      setVolumeData(response.data);
    } catch (error) {
      console.error('Failed to fetch volume data:', error);
    }
  };

  const fetchPersonalRecords = async () => {
    try {
      const response = await analyticsAPI.getPersonalRecords();
      setPersonalRecords(response.data.slice(0, 10)); // Top 10 PRs
    } catch (error) {
      console.error('Failed to fetch personal records:', error);
    }
  };

  const handleResetProgression = async () => {
    if (!selectedExercise) return;
    setResetModalOpen(false);

    try {
      await progressionAPI.resetExercise(selectedExercise);
      alert('Progression reset successfully. New baseline will be calculated after your next workout.');
      fetchProgressionData(); // Refresh data
    } catch (error) {
      console.error('Failed to reset progression:', error);
      alert('Failed to reset progression');
    }
  };

  const handleResetAllFirst = () => {
    setResetAllModalOpen(false);
    setResetAllConfirmOpen(true);
  };

  const handleResetAllProgressions = async () => {
    setResetAllConfirmOpen(false);

    try {
      await progressionAPI.resetAll();
      alert('All progressions reset successfully. New baselines will be calculated after your next workouts.');
      fetchProgressionData(); // Refresh current exercise data
    } catch (error) {
      console.error('Failed to reset all progressions:', error);
      alert('Failed to reset progressions');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
          Loading progress data...
        </div>
      </div>
    );
  }

  const selectedExerciseName = exercises.find(e => e.id === selectedExercise)?.name || '';

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Progress & Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your strength gains and workout trends
          </p>
        </div>
        <button
          onClick={() => setResetAllModalOpen(true)}
          style={{
            padding: '0.75rem 1.5rem',
            border: '2px solid var(--danger)',
            borderRadius: '0.5rem',
            backgroundColor: 'transparent',
            color: 'var(--danger)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--danger)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--danger)';
          }}
        >
          Reset All Progressions
        </button>
      </div>

      {/* Exercise Progression Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
              Exercise Progression
            </h2>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--background)',
            borderRadius: '0.5rem',
            padding: '0.25rem',
            gap: '0.25rem'
          }}>
            <button
              onClick={() => setViewMode('single')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.375rem',
                backgroundColor: viewMode === 'single' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'single' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Single Exercise
            </button>
            <button
              onClick={() => setViewMode('template')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.375rem',
                backgroundColor: viewMode === 'template' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'template' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Template View
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'single' ? '1fr auto auto' : '1fr auto',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}>
              {viewMode === 'single' ? 'Select Exercise' : 'Select Template'}
            </label>
            {viewMode === 'single' ? (
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="input"
                style={{ width: '100%', padding: '0.5rem' }}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="input"
                style={{ width: '100%', padding: '0.5rem' }}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}>
              Time Range
            </label>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="input"
              style={{ padding: '0.5rem' }}
            >
              <option value="1month">1 Month</option>
              <option value="3months">3 Months</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          {viewMode === 'single' && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)'
              }}>
                Actions
              </label>
              <button
                onClick={() => setResetModalOpen(true)}
                disabled={!selectedExercise}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--danger)',
                  borderRadius: '0.375rem',
                  backgroundColor: 'transparent',
                  color: 'var(--danger)',
                  cursor: selectedExercise ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: selectedExercise ? 1 : 0.5,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (selectedExercise) {
                    e.currentTarget.style.backgroundColor = 'var(--danger)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
              >
                Reset Progression
              </button>
            </div>
          )}
        </div>

        {viewMode === 'single' ? (
          progressionData && progressionData.data.length > 0 ? (
            <div style={{
              backgroundColor: 'var(--background)',
              padding: '1.5rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {selectedExerciseName} Weight Progression
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Track your strength gains over time
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressionData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <YAxis style={{ fontSize: '0.75rem' }} />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Max Weight (lbs)"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgWeight"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Avg Weight (lbs)"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              padding: '3rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.375rem',
              textAlign: 'center',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
              <p style={{ color: 'var(--text-secondary)' }}>
                No progression data available for this exercise
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Complete some workouts to start tracking your progress
              </p>
            </div>
          )
        ) : (
          multiExerciseData && multiExerciseData.mergedData.length > 0 ? (
            <div style={{
              backgroundColor: 'var(--background)',
              padding: '1.5rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {templates.find(t => t.id === selectedTemplate)?.name || 'Template'} - All Exercises
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Compare progress across all exercises in this template
                </p>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={multiExerciseData.mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <YAxis
                    label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {multiExerciseData.exercises.map((exercise: any) => (
                    <Line
                      key={exercise.id}
                      type="monotone"
                      dataKey={`${exercise.name}_maxWeight`}
                      stroke={exercise.color}
                      strokeWidth={2}
                      name={exercise.name}
                      dot={{ fill: exercise.color, r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              padding: '3rem',
              backgroundColor: 'var(--background)',
              borderRadius: '0.375rem',
              textAlign: 'center',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
              <p style={{ color: 'var(--text-secondary)' }}>
                No progression data available for this template
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {templates.find(t => t.id === selectedTemplate)?.templateExercises?.length === 0
                  ? 'This template has no exercises'
                  : 'Complete some workouts to start tracking your progress'}
              </p>
            </div>
          )
        )}
      </div>

      {/* Weekly Volume Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💪</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
              Weekly Volume
            </h2>
          </div>
          <span style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            Last 12 Weeks
          </span>
        </div>

        {volumeData.length > 0 ? (
          <div style={{
            backgroundColor: 'var(--background)',
            padding: '1.5rem',
            borderRadius: '0.375rem'
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  style={{ fontSize: '0.75rem' }}
                />
                <YAxis style={{ fontSize: '0.75rem' }} />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalVolume"
                  fill="#3b82f6"
                  name="Total Volume (lbs)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{
            padding: '3rem',
            backgroundColor: 'var(--background)',
            borderRadius: '0.375rem',
            textAlign: 'center',
            border: '2px dashed var(--border)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              No volume data available
            </p>
          </div>
        )}
      </div>

      {/* Personal Records Card */}
      <div className="card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
              Personal Records
            </h2>
          </div>
          {personalRecords.length > 0 && (
            <span style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}>
              Top {personalRecords.length}
            </span>
          )}
        </div>

        {personalRecords.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background)' }}>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Exercise
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Record
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {personalRecords.map((pr, index) => (
                  <tr
                    key={pr.exerciseId}
                    style={{
                      borderTop: '1px solid var(--border)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--background)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-bg)',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {index + 1}
                        </span>
                        <span style={{ fontWeight: 500 }}>{pr.exerciseName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      {pr.maxWeight ? (
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {pr.maxWeight} lbs × {pr.reps} reps
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {new Date(pr.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            padding: '3rem',
            backgroundColor: 'var(--background)',
            borderRadius: '0.375rem',
            textAlign: 'center',
            border: '2px dashed var(--border)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              No personal records yet
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Keep training to set your first PR!
            </p>
          </div>
        )}
      </div>

      {/* Reset Progression Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset Progression"
        message={`Reset progression history for ${exercises.find(e => e.id === selectedExercise)?.name || 'this exercise'}? This will recalibrate your recommendations on the next workout.`}
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleResetProgression}
        onCancel={() => setResetModalOpen(false)}
        danger={true}
      />

      {/* Reset All Progressions Modal - First Warning */}
      <ConfirmModal
        isOpen={resetAllModalOpen}
        title="⚠️ Reset ALL Progressions?"
        message="This will clear progression history for ALL exercises and recalibrate recommendations across your entire workout program. This action cannot be undone."
        confirmText="Continue"
        cancelText="Cancel"
        onConfirm={handleResetAllFirst}
        onCancel={() => setResetAllModalOpen(false)}
        danger={true}
      />

      {/* Reset All Progressions Modal - Double Confirmation */}
      <ConfirmModal
        isOpen={resetAllConfirmOpen}
        title="Are You Absolutely Sure?"
        message="This will affect all exercises and cannot be reversed."
        confirmText="Yes, Reset All"
        cancelText="Cancel"
        onConfirm={handleResetAllProgressions}
        onCancel={() => setResetAllConfirmOpen(false)}
        danger={true}
      />
    </div>
  );
}
