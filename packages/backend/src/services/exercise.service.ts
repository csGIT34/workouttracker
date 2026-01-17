import { prisma } from '../lib/prisma.js';
import { CreateExerciseDto, UpdateExerciseDto } from '@workout-tracker/shared';

export class ExerciseService {
  /**
   * Get all exercises accessible to a user (global + user's custom exercises)
   */
  async getExercises(userId: string) {
    return prisma.exercise.findMany({
      where: {
        OR: [
          { userId: null },      // Global exercises
          { userId: userId },    // User's custom exercises
        ],
      },
      include: {
        muscleGroup: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single exercise by ID
   * Verifies the exercise is either global or belongs to the user
   */
  async getExerciseById(userId: string, exerciseId: string) {
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { userId: null },      // Global exercise
          { userId: userId },    // User's exercise
        ],
      },
      include: {
        muscleGroup: true,
        category: true,
      },
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    return exercise;
  }

  /**
   * Create a new custom exercise for a user
   */
  async createExercise(userId: string, data: CreateExerciseDto) {
    // Check for duplicate name for this user
    const existing = await prisma.exercise.findFirst({
      where: {
        name: data.name,
        OR: [
          { userId: null },
          { userId: userId },
        ],
      },
    });

    if (existing) {
      throw new Error('An exercise with this name already exists');
    }

    return prisma.exercise.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        muscleGroupId: data.muscleGroupId,
        categoryId: data.categoryId,
        type: data.type || 'STRENGTH',
      },
      include: {
        muscleGroup: true,
        category: true,
      },
    });
  }

  /**
   * Update a custom exercise
   * Only the owner can update their custom exercises
   */
  async updateExercise(userId: string, exerciseId: string, data: UpdateExerciseDto) {
    // Verify user owns the exercise (not a global exercise)
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        userId,
      },
    });

    if (!exercise) {
      throw new Error('Exercise not found or you do not have permission to edit it');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== exercise.name) {
      const existing = await prisma.exercise.findFirst({
        where: {
          name: data.name,
          OR: [
            { userId: null },
            { userId: userId },
          ],
          NOT: {
            id: exerciseId,
          },
        },
      });

      if (existing) {
        throw new Error('An exercise with this name already exists');
      }
    }

    return prisma.exercise.update({
      where: { id: exerciseId },
      data,
      include: {
        muscleGroup: true,
        category: true,
      },
    });
  }

  /**
   * Delete a custom exercise
   * Only the owner can delete their custom exercises
   */
  async deleteExercise(userId: string, exerciseId: string) {
    // Verify user owns the exercise (not a global exercise)
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        userId,
      },
    });

    if (!exercise) {
      throw new Error('Exercise not found or you do not have permission to delete it');
    }

    // Check if exercise is used in any templates
    const templateCount = await prisma.templateExercise.count({
      where: { exerciseId },
    });

    // Check if exercise has progression data
    const progressionCount = await prisma.exerciseProgression.count({
      where: { exerciseId, userId },
    });

    // Check if exercise is used in any workouts
    const workoutCount = await prisma.workoutExercise.count({
      where: { exerciseId },
    });

    // Return warning info along with deletion
    const warningInfo = {
      hasTemplates: templateCount > 0,
      hasProgression: progressionCount > 0,
      hasWorkouts: workoutCount > 0,
      templateCount,
      progressionCount,
      workoutCount,
    };

    // Delete the exercise (cascade will handle related records)
    await prisma.exercise.delete({
      where: { id: exerciseId },
    });

    return warningInfo;
  }

  /**
   * Admin: Create a global exercise
   */
  async createGlobalExercise(data: CreateExerciseDto) {
    // Check for duplicate name
    const existing = await prisma.exercise.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('An exercise with this name already exists');
    }

    return prisma.exercise.create({
      data: {
        userId: null, // Global exercise
        name: data.name,
        description: data.description,
        muscleGroupId: data.muscleGroupId,
        categoryId: data.categoryId,
        type: data.type || 'STRENGTH',
      },
      include: {
        muscleGroup: true,
        category: true,
      },
    });
  }

  /**
   * Admin: Update any exercise (including global)
   */
  async updateExerciseAsAdmin(exerciseId: string, data: UpdateExerciseDto) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== exercise.name) {
      const existing = await prisma.exercise.findFirst({
        where: {
          name: data.name,
          NOT: { id: exerciseId },
        },
      });

      if (existing) {
        throw new Error('An exercise with this name already exists');
      }
    }

    return prisma.exercise.update({
      where: { id: exerciseId },
      data,
      include: {
        muscleGroup: true,
        category: true,
      },
    });
  }

  /**
   * Admin: Delete any exercise (including global)
   */
  async deleteExerciseAsAdmin(exerciseId: string) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Check if exercise is used in any templates
    const templateCount = await prisma.templateExercise.count({
      where: { exerciseId },
    });

    // Check if exercise has progression data
    const progressionCount = await prisma.exerciseProgression.count({
      where: { exerciseId },
    });

    // Check if exercise is used in any workouts
    const workoutCount = await prisma.workoutExercise.count({
      where: { exerciseId },
    });

    // Return warning info along with deletion
    const warningInfo = {
      hasTemplates: templateCount > 0,
      hasProgression: progressionCount > 0,
      hasWorkouts: workoutCount > 0,
      templateCount,
      progressionCount,
      workoutCount,
    };

    // Delete the exercise (cascade will handle related records)
    await prisma.exercise.delete({
      where: { id: exerciseId },
    });

    return warningInfo;
  }
}

export const exerciseService = new ExerciseService();
