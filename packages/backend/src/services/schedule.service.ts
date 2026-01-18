import { prisma } from '../lib/prisma.js';
import { SetScheduleDto, WeeklySchedule } from '@workout-tracker/shared';

export class ScheduleService {
  async setSchedule(userId: string, data: SetScheduleDto) {
    // Verify template belongs to user
    const template = await prisma.workoutTemplate.findFirst({
      where: {
        id: data.templateId,
        userId,
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Validate day of week (0-6)
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
      throw new Error('Invalid day of week (must be 0-6)');
    }

    // Upsert schedule for this day
    return prisma.workoutSchedule.upsert({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      update: {
        templateId: data.templateId,
        isActive: true,
      },
      create: {
        userId,
        templateId: data.templateId,
        dayOfWeek: data.dayOfWeek,
      },
      include: {
        template: {
          include: {
            templateExercises: {
              include: {
                exercise: true,
              },
            },
          },
        },
      },
    });
  }

  async getWeeklySchedule(userId: string): Promise<WeeklySchedule> {
    const schedules = await prisma.workoutSchedule.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        template: {
          include: {
            templateExercises: {
              include: {
                exercise: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    // Map to weekly schedule object
    const weeklySchedule: WeeklySchedule = {};
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const;

    schedules.forEach((schedule) => {
      const dayName = dayNames[schedule.dayOfWeek];
      weeklySchedule[dayName] = schedule;
    });

    return weeklySchedule;
  }

  async getScheduleForToday(userId: string) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    return prisma.workoutSchedule.findFirst({
      where: {
        userId,
        dayOfWeek,
        isActive: true,
      },
      include: {
        template: {
          include: {
            templateExercises: {
              include: {
                exercise: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  async removeSchedule(userId: string, dayOfWeek: number) {
    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('Invalid day of week (must be 0-6)');
    }

    const schedule = await prisma.workoutSchedule.findFirst({
      where: {
        userId,
        dayOfWeek,
      },
    });

    if (!schedule) {
      throw new Error('No schedule found for this day');
    }

    return prisma.workoutSchedule.delete({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek,
        },
      },
    });
  }

  async getMonthSchedule(userId: string, year: number, month: number) {
    // Get all schedules for the user
    const schedules = await prisma.workoutSchedule.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        template: true,
      },
    });

    // Get all completed workouts for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        completedAt: true,
        startedAt: true,
        templateId: true,
      },
    });

    // Build calendar data
    const calendarData: Array<{
      date: Date;
      schedule: typeof schedules[number] | undefined;
      workouts: Array<{
        id: string;
        name: string;
        status: string;
        completedAt: Date | null;
        templateId: string | null;
      }>;
    }> = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      // Find scheduled workout for this day
      const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

      // Find ALL workouts for this day (can have multiple: scheduled + ad-hoc)
      const dayWorkouts = workouts.filter((w) => {
        const workoutDate = new Date(w.startedAt);
        return (
          workoutDate.getDate() === day &&
          workoutDate.getMonth() === month - 1 &&
          workoutDate.getFullYear() === year
        );
      });

      calendarData.push({
        date,
        schedule,
        workouts: dayWorkouts.map((w) => ({
          id: w.id,
          name: w.name,
          status: w.status,
          completedAt: w.completedAt,
          templateId: w.templateId,
        })),
      });
    }

    return calendarData;
  }
}

export const scheduleService = new ScheduleService();
