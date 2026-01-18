import { prisma } from '../lib/prisma.js';

/**
 * CalorieService - Calculates calories burned during workouts using MET values
 * Based on the formula: Calories = MET × Body Weight (kg) × Time (hours)
 * Reference: Ainsworth et al., 2011 Compendium of Physical Activities
 */
export class CalorieService {
  /**
   * Maps RPE (Rate of Perceived Exertion) to MET values for strength training
   * @param rpe - RPE value from 1-10, or undefined
   * @returns MET value for the given RPE
   */
  getRPEtoMET(rpe?: number): number {
    if (!rpe) return 5.0; // Default moderate intensity

    if (rpe >= 1 && rpe <= 5) return 3.5; // Light intensity
    if (rpe >= 6 && rpe <= 7) return 5.0; // Moderate intensity
    if (rpe >= 8 && rpe <= 9) return 6.5; // Vigorous intensity
    if (rpe === 10) return 8.0; // Maximum intensity

    return 5.0; // Default fallback
  }

  /**
   * Calculates calories burned for a single set or activity
   * @param metValue - MET value for the activity
   * @param weightKg - User's weight in kilograms
   * @param durationSeconds - Duration of the activity in seconds
   * @returns Calories burned (rounded to nearest integer)
   */
  calculateSetCalories(metValue: number, weightKg: number, durationSeconds: number): number {
    const durationHours = durationSeconds / 3600;
    const calories = metValue * weightKg * durationHours;
    return Math.round(calories);
  }

  /**
   * Estimates the duration of a strength training set based on reps
   * @param reps - Number of repetitions
   * @returns Estimated duration in seconds (5 seconds per rep)
   */
  estimateSetDuration(reps: number): number {
    return reps * 5; // 5 seconds per rep average
  }

  /**
   * Calculates total calories burned for strength training exercises
   * Includes both active work and rest periods
   * @param sets - Array of sets with reps and RPE
   * @param userWeightKg - User's weight in kilograms
   * @param restBetweenSets - Rest time between sets in seconds
   * @returns Object with total calories, active time, and rest time
   */
  calculateStrengthCalories(
    sets: Array<{ reps: number; rpe?: number }>,
    userWeightKg: number,
    restBetweenSets?: number
  ): { calories: number; activeTime: number; restTime: number } {
    let totalCalories = 0;
    let totalActiveTime = 0;
    let totalRestTime = 0;

    // Calculate calories for active work
    for (const set of sets) {
      const metValue = this.getRPEtoMET(set.rpe);
      const setDuration = this.estimateSetDuration(set.reps);
      totalActiveTime += setDuration;
      totalCalories += this.calculateSetCalories(metValue, userWeightKg, setDuration);
    }

    // Calculate calories for rest periods (1.5 MET for sitting/light activity)
    if (restBetweenSets && sets.length > 1) {
      const REST_MET = 1.5;
      const numberOfRestPeriods = sets.length - 1;
      totalRestTime = numberOfRestPeriods * restBetweenSets;
      totalCalories += this.calculateSetCalories(REST_MET, userWeightKg, totalRestTime);
    }

    return {
      calories: totalCalories,
      activeTime: totalActiveTime,
      restTime: totalRestTime,
    };
  }

  /**
   * Calculates total calories burned for cardio exercises
   * @param sets - Array of sets with duration
   * @param userWeightKg - User's weight in kilograms
   * @param exerciseMetValue - MET value for the cardio exercise
   * @returns Object with total calories, active time, and rest time
   */
  calculateCardioCalories(
    sets: Array<{ durationMinutes: number }>,
    userWeightKg: number,
    exerciseMetValue?: number
  ): { calories: number; activeTime: number; restTime: number } {
    const metValue = exerciseMetValue || 6.0; // Default moderate cardio if not specified
    let totalCalories = 0;
    let totalActiveTime = 0;

    for (const set of sets) {
      const durationSeconds = set.durationMinutes * 60;
      totalActiveTime += durationSeconds;
      totalCalories += this.calculateSetCalories(metValue, userWeightKg, durationSeconds);
    }

    return {
      calories: totalCalories,
      activeTime: totalActiveTime,
      restTime: 0, // No rest periods for cardio
    };
  }

  /**
   * Converts weight from LBS to KG
   * @param weight - Weight value
   * @param unit - Weight unit (LBS or KG)
   * @returns Weight in kilograms
   */
  convertWeightToKg(weight: number, unit: 'LBS' | 'KG'): number {
    if (unit === 'KG') return weight;
    return weight / 2.20462; // 1 kg = 2.20462 lbs
  }

  /**
   * Calculates total calories burned for an entire workout
   * @param workoutId - ID of the workout
   * @param userId - ID of the user
   * @returns Object with total calories, active time, and rest time, or null if user weight not set
   */
  async calculateWorkoutCalories(
    workoutId: string,
    userId: string
  ): Promise<{ totalCalories: number; totalActiveTime: number; totalRestTime: number } | null> {
    // Fetch user weight
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { weight: true, weightUnit: true },
    });

    if (!user?.weight) {
      console.log('User weight not set, skipping calorie calculation');
      return null;
    }

    const userWeightKg = this.convertWeightToKg(user.weight, user.weightUnit);

    // Fetch workout with all exercises and sets
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            sets: {
              where: { completed: true },
              orderBy: { setNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    let totalCalories = 0;
    let totalActiveTime = 0;
    let totalRestTime = 0;

    // Calculate calories for each exercise
    for (const workoutExercise of workout.workoutExercises) {
      const { exercise, sets, restBetweenSets } = workoutExercise;

      if (sets.length === 0) continue; // Skip exercises with no completed sets

      if (exercise.type === 'STRENGTH') {
        // Strength training
        const strengthSets = sets
          .filter((set) => set.reps != null)
          .map((set) => ({
            reps: set.reps!,
            rpe: set.rpe ?? undefined,
          }));

        if (strengthSets.length > 0) {
          const result = this.calculateStrengthCalories(
            strengthSets,
            userWeightKg,
            restBetweenSets ?? undefined
          );
          totalCalories += result.calories;
          totalActiveTime += result.activeTime;
          totalRestTime += result.restTime;
        }
      } else if (exercise.type === 'CARDIO') {
        // Cardio - check if user manually entered calories first
        for (const set of sets) {
          if (set.caloriesBurned != null) {
            // User manually entered calories - use that value
            totalCalories += set.caloriesBurned;
            if (set.durationMinutes) {
              totalActiveTime += set.durationMinutes * 60;
            }
          } else if (set.durationMinutes != null) {
            // No manual calories - calculate based on duration and MET
            const metValue = exercise.metValue ?? 6.0;
            const durationSeconds = set.durationMinutes * 60;
            totalActiveTime += durationSeconds;
            totalCalories += this.calculateSetCalories(metValue, userWeightKg, durationSeconds);
          }
        }
      }
    }

    return {
      totalCalories,
      totalActiveTime,
      totalRestTime,
    };
  }

  /**
   * Updates the workout record with calculated calories
   * @param workoutId - ID of the workout
   * @param userId - ID of the user
   * @returns Updated workout or null if calculation failed
   */
  async updateWorkoutCalories(workoutId: string, userId: string) {
    try {
      const result = await this.calculateWorkoutCalories(workoutId, userId);

      if (!result) {
        console.log('Calorie calculation skipped (user weight not set)');
        return null;
      }

      const updatedWorkout = await prisma.workout.update({
        where: { id: workoutId },
        data: {
          totalCaloriesBurned: result.totalCalories,
          totalActiveTime: result.totalActiveTime,
          totalRestTime: result.totalRestTime,
        },
      });

      return updatedWorkout;
    } catch (error) {
      console.error('Error updating workout calories:', error);
      throw error;
    }
  }
}

export const calorieService = new CalorieService();
