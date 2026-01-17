import { useState, useEffect } from 'react';
import { scheduleAPI, templateAPI } from '../services/api';
import { WorkoutSchedule, WorkoutTemplate, WeeklySchedule } from '@workout-tracker/shared';

const DAYS = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
];

export default function SchedulePlanner() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [scheduleRes, templatesRes] = await Promise.all([
        scheduleAPI.getWeekly(),
        templateAPI.getAll(),
      ]);
      setSchedule(scheduleRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetSchedule = async (dayOfWeek: number, templateId: string) => {
    try {
      await scheduleAPI.setSchedule(dayOfWeek, templateId);
      await fetchData();
    } catch (error) {
      console.error('Failed to set schedule:', error);
      alert('Failed to set schedule');
    }
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmMessage('');
    setConfirmAction(null);
  };

  const handleClearSchedule = async (dayOfWeek: number) => {
    showConfirm('Clear this day\'s workout?', async () => {
      try {
        await scheduleAPI.clearSchedule(dayOfWeek);
        await fetchData();
      } catch (error) {
        console.error('Failed to clear schedule:', error);
        alert('Failed to clear schedule');
      }
    });
  };

  const getScheduleForDay = (dayOfWeek: number): WorkoutSchedule | undefined => {
    const dayName = DAYS[dayOfWeek].name.toLowerCase() as keyof WeeklySchedule;
    return schedule[dayName];
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
          Loading schedule...
        </div>
      </div>
    );
  }

  const currentDay = new Date().getDay();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Weekly Schedule
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Plan your workout routine throughout the week
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '4rem 2rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No Templates Available
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            maxWidth: '500px',
            margin: '0 auto 2rem'
          }}>
            Create workout templates first before scheduling your week.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {DAYS.map((day) => {
            const daySchedule = getScheduleForDay(day.value);
            const isToday = currentDay === day.value;

            return (
              <div
                key={day.value}
                className="card"
                style={{
                  position: 'relative',
                  border: isToday ? '2px solid var(--primary)' : undefined,
                  boxShadow: isToday ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : undefined,
                }}
              >
                {/* Day Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: isToday ? 'var(--primary)' : 'var(--text)'
                    }}>
                      {day.name}
                    </h3>
                  </div>
                  {isToday && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--primary)',
                      backgroundColor: 'var(--primary-bg)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem'
                    }}>
                      Today
                    </span>
                  )}
                </div>

                {/* Assigned Template Display */}
                {daySchedule ? (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem',
                      backgroundColor: daySchedule.template?.color || '#3b82f6',
                      color: 'white',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                    }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        {daySchedule.template?.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                        {daySchedule.template?.templateExercises?.length || 0} exercises
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--background)',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    border: '2px dashed var(--border)'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>😴</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Rest Day
                    </div>
                  </div>
                )}

                {/* Template Selector */}
                <div style={{ marginBottom: daySchedule ? '0.75rem' : 0 }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {daySchedule ? 'Change Workout' : 'Assign Workout'}
                  </label>
                  <select
                    value={daySchedule?.templateId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSetSchedule(day.value, e.target.value);
                      }
                    }}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Button */}
                {daySchedule && (
                  <button
                    onClick={() => handleClearSchedule(day.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--danger)',
                      borderRadius: '0.375rem',
                      backgroundColor: 'transparent',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.2s'
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
                    Clear Schedule
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
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
          }}
          onClick={handleCancelConfirm}
        >
          <div
            className="card"
            style={{
              maxWidth: '400px',
              width: '90%',
              padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: 'var(--text)',
            }}>
              Confirm Action
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              lineHeight: '1.5',
            }}>
              {confirmMessage}
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancelConfirm}
                className="btn btn-outline"
                style={{
                  padding: '0.5rem 1.5rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '0.5rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
