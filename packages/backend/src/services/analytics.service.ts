import { prisma } from '../lib/prisma.js';
import {
  ExerciseProgressionHistory,
  VolumeByWeek,
  WorkoutFrequency,
  MuscleGroupDistribution,
  PersonalRecord,
  TimeRange,
  ExerciseType,
} from '@workout-tracker/shared';

export class AnalyticsService {
  private getDateRangeFromTimeRange(range: TimeRange): Date {
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000); // Far in the past
        break;
    }

    return startDate;
  }

  async getExerciseProgressionHistory(
    userId: string,
    exerciseId: string,
    range: TimeRange = '3months'
  ): Promise<ExerciseProgressionHistory> {
    const startDate = this.getDateRangeFromTimeRange(range);

    // Get exercise info
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Get all workouts with this exercise in the time range
    const workoutExercises = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        workout: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
          },
        },
      },
      include: {
        sets: {
          where: {
            completed: true,
          },
        },
        workout: {
          select: {
            completedAt: true,
          },
        },
      },
      orderBy: {
        workout: {
          completedAt: 'asc',
        },
      },
    });

    // Group by workout and calculate metrics
    const dataPoints = workoutExercises.map((we) => {
      const sets = we.sets;
      const date = we.workout.completedAt!;

      if (exercise.type === ExerciseType.CARDIO) {
        // Cardio metrics
        const durations = sets
          .map((s) => s.durationMinutes)
          .filter((d): d is number => d !== null && d !== undefined);
        const distances = sets
          .map((s) => s.distanceMiles)
          .filter((d): d is number => d !== null && d !== undefined);
        const calories = sets
          .map((s) => s.caloriesBurned)
          .filter((c): c is number => c !== null && c !== undefined);

        return {
          date,
          avgDuration: durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : undefined,
          totalDistance: distances.length > 0
            ? distances.reduce((a, b) => a + b, 0)
            : undefined,
          totalCalories: calories.length > 0
            ? calories.reduce((a, b) => a + b, 0)
            : undefined,
        };
      } else {
        // Strength training metrics
        const weights = sets
          .map((s) => s.weight)
          .filter((w): w is number => w !== null && w !== undefined);
        const reps = sets
          .map((s) => s.reps)
          .filter((r): r is number => r !== null && r !== undefined);

        const avgWeight = weights.length > 0
          ? weights.reduce((a, b) => a + b, 0) / weights.length
          : undefined;
        const maxWeight = weights.length > 0 ? Math.max(...weights) : undefined;
        const avgReps = reps.length > 0
          ? reps.reduce((a, b) => a + b, 0) / reps.length
          : undefined;

        // Calculate volume (weight * reps)
        const totalVolume = sets.reduce((sum, set) => {
          if (set.weight && set.reps) {
            return sum + set.weight * set.reps;
          }
          return sum;
        }, 0);

        return {
          date,
          avgWeight,
          maxWeight,
          totalVolume,
          avgReps,
        };
      }
    });

    return {
      exerciseId,
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      data: dataPoints,
    };
  }

  async getTotalVolumeByWeek(
    userId: string,
    weeks = 12
  ): Promise<VolumeByWeek[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
        },
      },
      include: {
        workoutExercises: {
          include: {
            sets: {
              where: {
                completed: true,
              },
            },
            exercise: {
              select: {
                type: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Group by week
    const weeklyData = new Map<string, { volume: number; count: number }>();

    workouts.forEach((workout) => {
      if (!workout.completedAt) return;

      // Get start of week (Sunday)
      const date = new Date(workout.completedAt);
      const day = date.getDay();
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - day);
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString();

      // Calculate volume for this workout (strength exercises only)
      const volume = workout.workoutExercises.reduce((workoutVolume, we) => {
        if (we.exercise.type !== ExerciseType.STRENGTH) return workoutVolume;

        const exerciseVolume = we.sets.reduce((sum, set) => {
          if (set.weight && set.reps) {
            return sum + set.weight * set.reps;
          }
          return sum;
        }, 0);

        return workoutVolume + exerciseVolume;
      }, 0);

      const existing = weeklyData.get(weekKey) || { volume: 0, count: 0 };
      weeklyData.set(weekKey, {
        volume: existing.volume + volume,
        count: existing.count + 1,
      });
    });

    // Convert to array and sort
    return Array.from(weeklyData.entries())
      .map(([weekKey, data]) => ({
        weekStart: new Date(weekKey),
        totalVolume: data.volume,
        workoutCount: data.count,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }

  async getWorkoutFrequency(
    userId: string,
    weeks = 12
  ): Promise<WorkoutFrequency[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
        },
      },
      select: {
        completedAt: true,
      },
    });

    // Group by week
    const weeklyData = new Map<string, number>();

    workouts.forEach((workout) => {
      if (!workout.completedAt) return;

      // Get start of week (Sunday)
      const date = new Date(workout.completedAt);
      const day = date.getDay();
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - day);
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString();

      weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1);
    });

    // Convert to array and sort
    return Array.from(weeklyData.entries())
      .map(([weekKey, count]) => ({
        weekStart: new Date(weekKey),
        workoutCount: count,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.workStart.getTime());
  }

  async getMuscleGroupDistribution(
    userId: string,
    range: TimeRange = '3months'
  ): Promise<MuscleGroupDistribution[]> {
    const startDate = this.getDateRangeFromTimeRange(range);

    const workoutExercises = await prisma.workoutExercise.findMany({
      where: {
        workout: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
          },
        },
        exercise: {
          type: ExerciseType.STRENGTH, // Only count strength exercises
        },
      },
      include: {
        exercise: {
          select: {
            muscleGroup: true,
          },
        },
      },
    });

    // Count by muscle group
    const distribution = new Map<string, number>();
    let total = 0;

    workoutExercises.forEach((we) => {
      if (we.exercise.muscleGroup) {
        const group = we.exercise.muscleGroup;
        distribution.set(group, (distribution.get(group) || 0) + 1);
        total++;
      }
    });

    // Convert to array with percentages
    return Array.from(distribution.entries())
      .map(([muscleGroup, count]) => ({
        muscleGroup,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    // Get all completed workouts with exercises and sets
    const workoutExercises = await prisma.workoutExercise.findMany({
      where: {
        workout: {
          userId,
          status: 'COMPLETED',
        },
      },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        sets: {
          where: {
            completed: true,
          },
        },
        workout: {
          select: {
            completedAt: true,
          },
        },
      },
    });

    // Find PRs for each exercise
    const recordsMap = new Map<string, PersonalRecord>();

    workoutExercises.forEach((we) => {
      const exerciseId = we.exercise.id;
      const exerciseName = we.exercise.name;
      const exerciseType = we.exercise.type;

      if (exerciseType === ExerciseType.CARDIO) {
        // Cardio PRs: longest distance, longest duration
        we.sets.forEach((set) => {
          const existing = recordsMap.get(exerciseId);

          if (set.distanceMiles) {
            if (
              !existing?.maxDistance ||
              set.distanceMiles > existing.maxDistance
            ) {
              recordsMap.set(exerciseId, {
                exerciseId,
                exerciseName,
                exerciseType,
                maxDistance: set.distanceMiles,
                bestTime: set.durationMinutes,
                date: we.workout.completedAt!,
              });
            }
          }
        });
      } else {
        // Strength PRs: heaviest weight
        we.sets.forEach((set) => {
          if (set.weight && set.reps) {
            const existing = recordsMap.get(exerciseId);

            if (!existing?.maxWeight || set.weight > existing.maxWeight) {
              recordsMap.set(exerciseId, {
                exerciseId,
                exerciseName,
                exerciseType,
                maxWeight: set.weight,
                reps: set.reps,
                date: we.workout.completedAt!,
              });
            }
          }
        });
      }
    });

    return Array.from(recordsMap.values()).sort((a, b) =>
      a.exerciseName.localeCompare(b.exerciseName)
    );
  }
}

export const analyticsService = new AnalyticsService();
