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
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
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
        const groupName = we.exercise.muscleGroup.name;
        distribution.set(groupName, (distribution.get(groupName) || 0) + 1);
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
                bestTime: set.durationMinutes ?? undefined,
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

  async getWorkoutStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastWorkoutDate: Date | null;
  }> {
    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: {
        completedAt: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (workouts.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };
    }

    // Get unique workout dates (ignore time, just date)
    const workoutDates = new Set<string>();
    workouts.forEach(w => {
      if (w.completedAt) {
        const date = new Date(w.completedAt);
        date.setHours(0, 0, 0, 0);
        workoutDates.add(date.toISOString());
      }
    });

    const sortedDates = Array.from(workoutDates)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let checkDate = new Date(today);
    // Start from today or yesterday
    if (sortedDates[0].getTime() === today.getTime()) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (sortedDates[0].getTime() === yesterday.getTime()) {
      currentStreak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // No recent workout
      currentStreak = 0;
    }

    // Count consecutive days
    if (currentStreak > 0) {
      for (let i = 1; i < sortedDates.length; i++) {
        if (sortedDates[i].getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const daysDiff = Math.floor(
        (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate: workouts[0].completedAt,
    };
  }

  async getWeeklyVolumeComparison(userId: string): Promise<{
    thisWeek: number;
    lastWeek: number;
    percentChange: number;
  }> {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setSeconds(lastWeekEnd.getSeconds() - 1);

    const [thisWeekWorkouts, lastWeekWorkouts] = await Promise.all([
      prisma.workout.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: thisWeekStart },
        },
        include: {
          workoutExercises: {
            include: {
              sets: { where: { completed: true } },
              exercise: { select: { type: true } },
            },
          },
        },
      }),
      prisma.workout.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: lastWeekStart, lt: lastWeekEnd },
        },
        include: {
          workoutExercises: {
            include: {
              sets: { where: { completed: true } },
              exercise: { select: { type: true } },
            },
          },
        },
      }),
    ]);

    const calculateVolume = (workouts: any[]) => {
      return workouts.reduce((total, workout) => {
        return total + workout.workoutExercises.reduce((wTotal: number, we: any) => {
          if (we.exercise.type !== ExerciseType.STRENGTH) return wTotal;
          return wTotal + we.sets.reduce((sTotal: number, set: any) => {
            return sTotal + (set.weight && set.reps ? set.weight * set.reps : 0);
          }, 0);
        }, 0);
      }, 0);
    };

    const thisWeek = calculateVolume(thisWeekWorkouts);
    const lastWeek = calculateVolume(lastWeekWorkouts);
    const percentChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    return { thisWeek, lastWeek, percentChange };
  }

  async getWeeklyCalorieComparison(userId: string): Promise<{
    thisWeek: number;
    lastWeek: number;
    percentChange: number;
  }> {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setSeconds(lastWeekEnd.getSeconds() - 1);

    const [thisWeekWorkouts, lastWeekWorkouts] = await Promise.all([
      prisma.workout.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: thisWeekStart },
        },
        select: {
          totalCaloriesBurned: true,
          completedAt: true,
        },
      }),
      prisma.workout.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: lastWeekStart, lt: lastWeekEnd },
        },
        select: {
          totalCaloriesBurned: true,
          completedAt: true,
        },
      }),
    ]);

    console.log('Weekly Calorie Comparison Debug:');
    console.log('This week start:', thisWeekStart);
    console.log('This week workouts:', thisWeekWorkouts.length, thisWeekWorkouts);
    console.log('Last week start:', lastWeekStart, 'end:', lastWeekEnd);
    console.log('Last week workouts:', lastWeekWorkouts.length, lastWeekWorkouts);

    const thisWeek = thisWeekWorkouts.reduce((sum, w) => sum + (w.totalCaloriesBurned || 0), 0);
    const lastWeek = lastWeekWorkouts.reduce((sum, w) => sum + (w.totalCaloriesBurned || 0), 0);
    const percentChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    console.log('This week calories:', thisWeek);
    console.log('Last week calories:', lastWeek);
    console.log('Percent change:', percentChange);

    return { thisWeek, lastWeek, percentChange };
  }

  async getRecentPRs(userId: string, limit = 5): Promise<PersonalRecord[]> {
    const allPRs = await this.getPersonalRecords(userId);
    return allPRs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  async getMonthlySummary(userId: string): Promise<{
    totalVolume: number;
    totalCalories: number;
    averageDuration: number;
    workoutCount: number;
    topMuscleGroups: Array<{ name: string; count: number }>;
  }> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: monthStart },
      },
      include: {
        workoutExercises: {
          include: {
            sets: { where: { completed: true } },
            exercise: {
              include: {
                muscleGroup: true,
              },
            },
          },
        },
      },
    });

    const totalVolume = workouts.reduce((total, workout) => {
      return total + workout.workoutExercises.reduce((wTotal, we) => {
        if (we.exercise.type !== ExerciseType.STRENGTH) return wTotal;
        return wTotal + we.sets.reduce((sTotal, set) => {
          return sTotal + (set.weight && set.reps ? set.weight * set.reps : 0);
        }, 0);
      }, 0);
    }, 0);

    // Calculate total calories from workouts
    const totalCalories = workouts.reduce((total, workout) => {
      return total + (workout.totalCaloriesBurned || 0);
    }, 0);

    const durations = workouts
      .filter(w => w.startedAt && w.completedAt)
      .map(w => {
        const duration = new Date(w.completedAt!).getTime() - new Date(w.startedAt).getTime();
        return duration / (1000 * 60); // minutes
      });

    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Count muscle groups
    const muscleGroupCounts = new Map<string, number>();
    workouts.forEach(workout => {
      workout.workoutExercises.forEach(we => {
        if (we.exercise.muscleGroup) {
          const name = we.exercise.muscleGroup.name;
          muscleGroupCounts.set(name, (muscleGroupCounts.get(name) || 0) + 1);
        }
      });
    });

    const topMuscleGroups = Array.from(muscleGroupCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalVolume,
      totalCalories,
      averageDuration: Math.round(averageDuration),
      workoutCount: workouts.length,
      topMuscleGroups,
    };
  }

  async getCardioDistanceStats(userId: string, period: 'week' | 'month'): Promise<Array<{
    exerciseName: string;
    totalDistance: number;
    totalDuration: number;
    workoutCount: number;
  }>> {
    const startDate = new Date();

    if (period === 'week') {
      // Start of current week (Sunday)
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Start of current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      include: {
        workoutExercises: {
          where: {
            exercise: {
              type: ExerciseType.CARDIO,
            },
          },
          include: {
            sets: { where: { completed: true } },
            exercise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by exercise
    const exerciseStats = new Map<string, {
      exerciseName: string;
      totalDistance: number;
      totalDuration: number;
      workoutCount: number;
    }>();

    workouts.forEach(workout => {
      workout.workoutExercises.forEach(we => {
        const exerciseKey = we.exercise.id;
        const exerciseName = we.exercise.name;

        const existing = exerciseStats.get(exerciseKey) || {
          exerciseName,
          totalDistance: 0,
          totalDuration: 0,
          workoutCount: 0,
        };

        const distance = we.sets.reduce((sum, set) => sum + (set.distanceMiles || 0), 0);
        const duration = we.sets.reduce((sum, set) => sum + (set.durationMinutes || 0), 0);

        exerciseStats.set(exerciseKey, {
          exerciseName,
          totalDistance: existing.totalDistance + distance,
          totalDuration: existing.totalDuration + duration,
          workoutCount: existing.workoutCount + 1,
        });
      });
    });

    return Array.from(exerciseStats.values())
      .sort((a, b) => b.totalDistance - a.totalDistance);
  }

  async getRecentActivity(userId: string, limit = 5): Promise<Array<{
    id: string;
    name: string;
    completedAt: Date;
    duration: number;
    volume: number;
    exerciseCount: number;
    highlights: string[];
  }>> {
    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      include: {
        workoutExercises: {
          include: {
            sets: { where: { completed: true } },
            exercise: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    });

    return workouts.map(workout => {
      const duration = workout.completedAt && workout.startedAt
        ? (new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()) / (1000 * 60)
        : 0;

      const volume = workout.workoutExercises.reduce((total, we) => {
        if (we.exercise.type !== ExerciseType.STRENGTH) return total;
        return total + we.sets.reduce((sTotal, set) => {
          return sTotal + (set.weight && set.reps ? set.weight * set.reps : 0);
        }, 0);
      }, 0);

      const highlights: string[] = [];

      // Find highest weight set
      let maxWeight = 0;
      let maxWeightExercise = '';
      workout.workoutExercises.forEach(we => {
        we.sets.forEach(set => {
          if (set.weight && set.weight > maxWeight) {
            maxWeight = set.weight;
            maxWeightExercise = we.exercise.name;
          }
        });
      });

      if (maxWeight > 0) {
        highlights.push(`${maxWeight} lbs on ${maxWeightExercise}`);
      }

      if (volume > 0) {
        highlights.push(`${Math.round(volume).toLocaleString()} lbs total volume`);
      }

      if (duration > 0) {
        highlights.push(`${Math.round(duration)} min`);
      }

      return {
        id: workout.id,
        name: workout.name,
        completedAt: workout.completedAt!,
        duration: Math.round(duration),
        volume: Math.round(volume),
        exerciseCount: workout.workoutExercises.length,
        highlights,
      };
    });
  }
}

export const analyticsService = new AnalyticsService();
