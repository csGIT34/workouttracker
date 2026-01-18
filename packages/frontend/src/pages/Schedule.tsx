import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import { scheduleAPI, workoutAPI, templateAPI } from '../services/api';
import { WorkoutSchedule, WorkoutTemplate, WeeklySchedule, WorkoutStatus } from '@workout-tracker/shared';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const DAYS = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
];

interface CalendarEvent extends Event {
  id: string;
  type: 'scheduled' | 'completed' | 'completed-scheduled' | 'missed' | 'in-progress';
  workoutId?: string;
  templateId?: string;
  color?: string;
  dayOfWeek?: number;
}

export default function Schedule() {
  const [activeTab, setActiveTab] = useState<'week' | 'calendar'>('week');
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Calendar-specific state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchWeeklySchedule();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarData();
    }
  }, [activeTab, currentDate]);

  const fetchWeeklySchedule = async () => {
    try {
      const response = await scheduleAPI.getWeekly();
      setSchedule(response.data);
    } catch (error) {
      console.error('Failed to fetch weekly schedule:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleSetSchedule = async (dayOfWeek: number, templateId: string) => {
    try {
      await scheduleAPI.setSchedule(dayOfWeek, templateId);
      await fetchWeeklySchedule();
      if (activeTab === 'calendar') {
        await fetchCalendarData();
      }
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
        await fetchWeeklySchedule();
        if (activeTab === 'calendar') {
          await fetchCalendarData();
        }
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

  // Calendar event handlers
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
      await fetchWeeklySchedule();
      await fetchCalendarData();
      setShowScheduleModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      alert('Failed to update schedule');
    }
  };

  const handleClearScheduleFromModal = async () => {
    if (!selectedEvent || selectedEvent.dayOfWeek === undefined) return;

    showConfirm('Clear this day\'s workout from the weekly schedule?', async () => {
      try {
        await scheduleAPI.clearSchedule(selectedEvent.dayOfWeek!);
        await fetchWeeklySchedule();
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
          Schedule & Calendar
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Plan your workout routine and track your progress
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '2px solid var(--border)',
      }}>
        <button
          onClick={() => setActiveTab('week')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'week' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'week' ? 600 : 400,
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'week' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s',
          }}
        >
          📅 Weekly Schedule
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'calendar' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'calendar' ? 600 : 400,
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'calendar' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s',
          }}
        >
          📆 Monthly Calendar
        </button>
      </div>

      {/* Weekly Schedule View */}
      {activeTab === 'week' && (
        <>
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
        </>
      )}

      {/* Monthly Calendar View */}
      {activeTab === 'calendar' && (
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
      )}

      {/* Schedule Update Modal (for calendar) */}
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
                  onClick={handleClearScheduleFromModal}
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
