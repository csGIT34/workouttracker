import { prisma } from '../lib/prisma.js';
import { ProgressionRecommendation } from '@workout-tracker/shared';

export class ProgressionService {
  async calculateProgression(userId: string, exerciseId: string) {
    // Get last 3 workouts for this exercise
    const workoutExercises = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        workout: {
          userId,
          status: 'COMPLETED',
        },
      },
      include: {
        sets: true,
        workout: true,
        exercise: true,
      },
      orderBy: {
        workout: {
          completedAt: 'desc',
        },
      },
      take: 3,
    });

    if (workoutExercises.length === 0) {
      return null;
    }

    const lastWorkout = workoutExercises[0];
    const allSets = lastWorkout.sets;

    if (allSets.length === 0) {
      return null;
    }

    // Calculate averages
    const avgWeight = allSets.reduce((sum, set) => sum + set.weight, 0) / allSets.length;
    const avgReps = allSets.reduce((sum, set) => sum + set.reps, 0) / allSets.length;

    // Calculate average RPE (only from sets that have RPE logged)
    const setsWithRPE = allSets.filter(set => set.rpe !== null);
    const avgRPE = setsWithRPE.length > 0
      ? setsWithRPE.reduce((sum, set) => sum + (set.rpe || 0), 0) / setsWithRPE.length
      : null;

    // Calculate completion rate
    const targetReps = lastWorkout.targetReps;
    const targetSets = lastWorkout.targetSets;
    const completionRate = avgReps / targetReps;
    const setsCompleted = allSets.length;
    const setsCompletionRate = setsCompleted / targetSets;

    // Determine recommendation using RPE and completion data
    let recommendation: ProgressionRecommendation;
    let recommendationDetails: string;

    // If we have RPE data, use it for better recommendations
    if (avgRPE !== null) {
      // RPE Scale: 1-6 = Easy, 7-8 = Moderate, 9-10 = Very Hard
      if (completionRate >= 1.0 && setsCompletionRate >= 1.0) {
        // All sets and reps completed
        if (avgRPE <= 7) {
          // Easy to moderate - increase weight
          recommendation = ProgressionRecommendation.INCREASE_WEIGHT;
          recommendationDetails = `Completed all sets/reps with RPE ${avgRPE.toFixed(1)}. Increase weight by 5 lbs.`;
        } else if (avgRPE <= 8.5) {
          // Challenging but doable - add reps first
          recommendation = ProgressionRecommendation.MORE_REPS;
          recommendationDetails = `Completed all sets/reps but RPE was ${avgRPE.toFixed(1)}. Add 2 more reps before increasing weight.`;
        } else {
          // Very hard - maintain
          recommendation = ProgressionRecommendation.MAINTAIN;
          recommendationDetails = `Completed sets but RPE was very high (${avgRPE.toFixed(1)}). Maintain current weight to build strength.`;
        }
      } else if (completionRate >= 0.9) {
        // Almost all reps completed
        if (avgRPE <= 7) {
          recommendation = ProgressionRecommendation.MORE_REPS;
          recommendationDetails = `Slight miss on target reps but RPE was low (${avgRPE.toFixed(1)}). Try to hit all ${targetReps} reps next time.`;
        } else {
          recommendation = ProgressionRecommendation.MAINTAIN;
          recommendationDetails = `Missed some reps and RPE was ${avgRPE.toFixed(1)}. Maintain weight and focus on form.`;
        }
      } else {
        // Struggled significantly
        recommendation = ProgressionRecommendation.MAINTAIN;
        recommendationDetails = `Completed ${Math.round(completionRate * 100)}% of target reps. Maintain current weight.`;
      }
    } else {
      // No RPE data - fall back to completion rate only
      if (completionRate >= 1.0 && setsCompletionRate >= 1.0) {
        recommendation = ProgressionRecommendation.INCREASE_WEIGHT;
        recommendationDetails = `All sets and reps completed. Increase weight by 5 lbs. (Tip: Log RPE for better recommendations!)`;
      } else if (completionRate >= 0.85) {
        recommendation = ProgressionRecommendation.MORE_REPS;
        recommendationDetails = `Most reps completed. Try to complete all ${targetReps} reps next time.`;
      } else {
        recommendation = ProgressionRecommendation.MAINTAIN;
        recommendationDetails = `Struggled with current weight. Maintain current weight and reps.`;
      }
    }

    // Update or create progression record
    await prisma.exerciseProgression.upsert({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
      update: {
        lastWorkoutId: lastWorkout.workoutId,
        avgWeight,
        avgReps,
        recommendation,
        recommendationDetails,
      },
      create: {
        userId,
        exerciseId,
        lastWorkoutId: lastWorkout.workoutId,
        avgWeight,
        avgReps,
        recommendation,
        recommendationDetails,
      },
    });

    return {
      exerciseId,
      exerciseName: lastWorkout.exercise.name,
      lastWorkout: {
        id: lastWorkout.workoutId,
        date: lastWorkout.workout.completedAt!,
        avgWeight,
        avgReps,
        completionRate,
      },
      recommendation,
      recommendationDetails,
    };
  }

  async getProgressionForExercise(userId: string, exerciseId: string) {
    const progression = await prisma.exerciseProgression.findUnique({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
      include: {
        exercise: true,
      },
    });

    if (!progression) {
      return this.calculateProgression(userId, exerciseId);
    }

    return {
      exerciseId: progression.exerciseId,
      exerciseName: progression.exercise.name,
      lastWorkout: {
        id: progression.lastWorkoutId,
        avgWeight: progression.avgWeight,
        avgReps: progression.avgReps,
      },
      recommendation: progression.recommendation,
      recommendationDetails: progression.recommendationDetails,
    };
  }

  async getRecommendations(userId: string) {
    const progressions = await prisma.exerciseProgression.findMany({
      where: { userId },
      include: {
        exercise: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return progressions.map((p) => ({
      exerciseId: p.exerciseId,
      exerciseName: p.exercise.name,
      recommendation: p.recommendation,
      recommendationDetails: p.recommendationDetails,
      lastUpdated: p.updatedAt,
    }));
  }

  async updateProgressionsAfterWorkout(userId: string, workoutId: string) {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    // Update progression for each exercise in the workout
    for (const workoutExercise of workout.workoutExercises) {
      await this.calculateProgression(userId, workoutExercise.exerciseId);
    }
  }

  /**
   * Reset progression for a specific exercise
   * This will recalibrate recommendations on the next workout
   */
  async resetProgression(userId: string, exerciseId: string) {
    const result = await prisma.exerciseProgression.deleteMany({
      where: {
        userId,
        exerciseId,
      },
    });

    return { deleted: result.count };
  }

  /**
   * Reset all progressions for a user
   * Use with caution - this clears all progression history
   */
  async resetAllProgressions(userId: string) {
    const result = await prisma.exerciseProgression.deleteMany({
      where: { userId },
    });

    return { deleted: result.count };
  }
}

export const progressionService = new ProgressionService();
