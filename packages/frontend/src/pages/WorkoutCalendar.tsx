import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import { scheduleAPI, workoutAPI, templateAPI } from '../services/api';
import { WorkoutStatus, WorkoutTemplate } from '@workout-tracker/shared';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: string;
  type: 'scheduled' | 'completed' | 'completed-scheduled' | 'missed' | 'in-progress';
  workoutId?: string;
  templateId?: string;
  color?: string;
  dayOfWeek?: number;
}

export default function WorkoutCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await templateAPI.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await scheduleAPI.getMonth(year, month);
      const calendarData = response.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const calendarEvents: CalendarEvent[] = calendarData.flatMap((day: any) => {
        const events: CalendarEvent[] = [];
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        const isPastDay = dayDate < today;

        // Process all workouts for this day
        if (day.workouts && day.workouts.length > 0) {
          day.workouts.forEach((workout: any) => {
            // Check if this workout matches the scheduled template
            const isScheduledWorkout = day.schedule && workout.templateId === day.schedule.templateId;

            if (isScheduledWorkout && workout.status === WorkoutStatus.COMPLETED) {
              // Scheduled workout completed
              events.push({
                id: workout.id,
                title: `${workout.name} ✓`,
                start: new Date(day.date),
                end: new Date(day.date),
                type: 'completed-scheduled',
                workoutId: workout.id,
                color: day.schedule.template?.color || '#10b981',
              });
            } else if (isScheduledWorkout && workout.status === WorkoutStatus.IN_PROGRESS) {
              // Scheduled workout in progress
              events.push({
                id: workout.id,
                title: `${workout.name} (In Progress)`,
                start: new Date(day.date),
                end: new Date(day.date),
                type: 'in-progress',
                workoutId: workout.id,
                color: day.schedule.template?.color || '#f59e0b',
              });
            } else if (!isScheduledWorkout && workout.status === WorkoutStatus.COMPLETED) {
              // Ad-hoc workout completed
              events.push({
                id: workout.id,
                title: `${workout.name} ✓`,
                start: new Date(day.date),
                end: new Date(day.date),
                type: 'completed',
                workoutId: workout.id,
                color: '#10b981',
              });
            } else if (!isScheduledWorkout && workout.status === WorkoutStatus.IN_PROGRESS) {
              // Ad-hoc workout in progress
              events.push({
                id: workout.id,
                title: `${workout.name} (In Progress)`,
                start: new Date(day.date),
                end: new Date(day.date),
                type: 'in-progress',
                workoutId: workout.id,
                color: '#f59e0b',
              });
            }
          });
        }

        // Check for scheduled workout that hasn't been started yet
        const hasScheduledWorkout = day.workouts?.some((w: any) =>
          day.schedule && w.templateId === day.schedule.templateId
        );

        if (day.schedule && !hasScheduledWorkout) {
          if (isPastDay) {
            // Scheduled workout was missed
            events.push({
              id: `missed-${day.date}`,
              title: `${day.schedule.template?.name} ✗`,
              start: new Date(day.date),
              end: new Date(day.date),
              type: 'missed',
              templateId: day.schedule.templateId,
              color: '#ef4444',
              dayOfWeek: new Date(day.date).getDay(),
            });
          } else {
            // Scheduled workout upcoming
            events.push({
              id: `schedule-${day.date}`,
              title: day.schedule.template?.name || 'Workout',
              start: new Date(day.date),
              end: new Date(day.date),
              type: 'scheduled',
              templateId: day.schedule.templateId,
              color: day.schedule.template?.color || '#3b82f6',
              dayOfWeek: new Date(day.date).getDay(),
            });
          }
        }

        return events;
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (event: CalendarEvent) => {
    if (event.type === 'in-progress' && event.workoutId) {
      // Resume in-progress workout
      navigate(`/workout/${event.workoutId}`);
    } else if ((event.type === 'completed' || event.type === 'completed-scheduled') && event.workoutId) {
      navigate(`/workouts/${event.workoutId}`);
    } else if (event.type === 'missed' || event.type === 'scheduled') {
      // Show modal with options to start, change, or clear schedule
      setSelectedEvent(event);
      setShowScheduleModal(true);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    // When clicking on an empty day, show modal to add schedule
    const dayOfWeek = slotInfo.start.getDay();
    const emptyEvent: CalendarEvent = {
      id: `empty-${slotInfo.start.toISOString()}`,
      title: '',
      start: slotInfo.start,
      end: slotInfo.end,
      type: 'scheduled',
      dayOfWeek: dayOfWeek,
    };
    setSelectedEvent(emptyEvent);
    setShowScheduleModal(true);
  };

  const handleStartWorkout = async () => {
    if (!selectedEvent || !selectedEvent.templateId) return;

    try {
      const activeResponse = await workoutAPI.getActive();
      if (activeResponse.data) {
        navigate(`/workout/${activeResponse.data.id}`);
        return;
      }

      const response = await workoutAPI.createFromTemplate(selectedEvent.templateId);
      navigate(`/workout/${response.data.id}`);
    } catch (error) {
      console.error('Failed to start workout:', error);
      alert('Failed to start workout');
    } finally {
      setShowScheduleModal(false);
      setSelectedEvent(null);
    }
  };

  const handleChangeSchedule = async (templateId: string) => {
    if (!selectedEvent || selectedEvent.dayOfWeek === undefined) return;

    try {
      await scheduleAPI.setSchedule(selectedEvent.dayOfWeek, templateId);
      await fetchCalendarData();
      setShowScheduleModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      alert('Failed to update schedule');
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

  const handleClearSchedule = async () => {
    if (!selectedEvent || selectedEvent.dayOfWeek === undefined) return;

    showConfirm('Clear this day\'s workout from the weekly schedule?', async () => {
      try {
        await scheduleAPI.clearSchedule(selectedEvent.dayOfWeek!);
        await fetchCalendarData();
        setShowScheduleModal(false);
        setSelectedEvent(null);
      } catch (error) {
        console.error('Failed to clear schedule:', error);
        alert('Failed to clear schedule');
      }
    });
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.type === 'completed-scheduled') {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '5px',
          opacity: 1,
          color: 'white',
          border: '2px solid #10b981',
          display: 'block',
          fontWeight: 600,
        },
      };
    } else if (event.type === 'completed') {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '5px',
          opacity: 0.9,
          color: 'white',
          border: 'none',
          display: 'block',
        },
      };
    } else if (event.type === 'in-progress') {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '5px',
          opacity: 1,
          color: 'white',
          border: '3px solid #f59e0b',
          display: 'block',
          fontWeight: 600,
          animation: 'pulse 2s infinite',
        },
      };
    } else if (event.type === 'missed') {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '5px',
          opacity: 0.8,
          color: 'white',
          border: '2px solid #dc2626',
          display: 'block',
          textDecoration: 'line-through',
        },
      };
    } else {
      // scheduled
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '5px',
          opacity: 0.6,
          color: 'white',
          border: '2px dashed rgba(255, 255, 255, 0.8)',
          display: 'block',
        },
      };
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
          Loading calendar...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Workout Calendar
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Track your scheduled and completed workouts
        </p>
      </div>

      <div className="card">
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          paddingBottom: '1rem',
          borderBottom: '2px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#10b981',
              borderRadius: '4px',
              border: '2px solid #10b981'
            }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Completed (Scheduled)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#10b981',
              borderRadius: '4px',
              opacity: 0.9
            }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Completed (Ad-hoc)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#f59e0b',
              borderRadius: '4px',
              border: '3px solid #f59e0b'
            }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#3b82f6',
              borderRadius: '4px',
              opacity: 0.6,
              border: '2px dashed rgba(255, 255, 255, 0.8)'
            }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Scheduled</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#ef4444',
              borderRadius: '4px',
              opacity: 0.8,
              border: '2px solid #dc2626'
            }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Missed</span>
          </div>
        </div>

        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onNavigate={(date) => setCurrentDate(date)}
          eventPropGetter={eventStyleGetter}
          views={['month']}
          defaultView="month"
          selectable
        />
      </div>

      {/* Schedule Update Modal */}
      {showScheduleModal && selectedEvent && (
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
          onClick={() => {
            setShowScheduleModal(false);
            setSelectedEvent(null);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {selectedEvent.templateId
                ? selectedEvent.type === 'missed'
                  ? selectedEvent.title.replace(' ✗', '')
                  : selectedEvent.title
                : `Schedule Workout - ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedEvent.dayOfWeek || 0]}`}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {selectedEvent.templateId
                ? selectedEvent.type === 'missed'
                  ? 'This scheduled workout was missed. You can start it now, change the schedule, or clear it.'
                  : 'Choose an action for this scheduled workout.'
                : 'Select a workout template to schedule for this day of the week.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Start Workout Button - only show if there's a template */}
              {selectedEvent.templateId && (
                <button
                  onClick={handleStartWorkout}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  Start Workout
                </button>
              )}

              {/* Change/Add Schedule Section */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--background)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}>
                  {selectedEvent.templateId ? 'Change Scheduled Workout' : 'Select Workout Template'}
                </label>
                <select
                  defaultValue={selectedEvent.templateId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleChangeSchedule(e.target.value);
                    }
                  }}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Schedule Button - only show if there's a template */}
              {selectedEvent.templateId && (
                <button
                  onClick={handleClearSchedule}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--danger)',
                    borderRadius: '0.375rem',
                    backgroundColor: 'transparent',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
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

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedEvent(null);
                }}
                className="btn btn-outline"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
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
            zIndex: 1001,
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
