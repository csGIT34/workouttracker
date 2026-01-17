import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { exerciseService } from '../services/exercise.service.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.middleware.js';

const createExerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  muscleGroupId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['STRENGTH', 'CARDIO']).optional(),
});

const updateExerciseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  muscleGroupId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['STRENGTH', 'CARDIO']).optional(),
});

export async function exerciseRoutes(fastify: FastifyInstance) {
  // Get all exercises (global + user's custom exercises)
  // This route supports authentication but doesn't require it for backward compatibility
  fastify.get('/', { preHandler: [optionalAuthenticate] }, async (request) => {
    // If authenticated, return global + user's exercises
    // If not authenticated, return only global exercises
    if (request.user) {
      return exerciseService.getExercises(request.user.userId);
    }

    // For unauthenticated requests, return only global exercises
    const { muscleGroup, category, search } = request.query as any;
    const where: any = { userId: null };

    if (muscleGroup) where.muscleGroupId = muscleGroup;
    if (category) where.categoryId = category;
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const { prisma } = await import('../lib/prisma.js');
    return prisma.exercise.findMany({
      where,
      include: {
        muscleGroup: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  // Get single exercise
  fastify.get('/:id', { preHandler: [optionalAuthenticate] }, async (request) => {
    const { id } = request.params as any;

    if (request.user) {
      return exerciseService.getExerciseById(request.user.userId, id);
    }

    // For unauthenticated requests, only allow global exercises
    const { prisma } = await import('../lib/prisma.js');
    const exercise = await prisma.exercise.findFirst({
      where: { id, userId: null },
      include: {
        muscleGroup: true,
        category: true,
      },
    });

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    return exercise;
  });

  // All routes below require authentication
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const data = createExerciseSchema.parse(request.body);
      return exerciseService.createExercise(request.user!.userId, data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  // Update exercise
  fastify.put('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = updateExerciseSchema.parse(request.body);
      return exerciseService.updateExercise(request.user!.userId, id, data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  // Delete exercise
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await exerciseService.deleteExercise(request.user!.userId, id);
    reply.status(204).send();
  });

  // ===== ADMIN ROUTES =====

  // Admin: Create global exercise
  fastify.post('/admin/global', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const data = createExerciseSchema.parse(request.body);
      return exerciseService.createGlobalExercise(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  // Admin: Update any exercise (including global)
  fastify.put('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = updateExerciseSchema.parse(request.body);
      return exerciseService.updateExerciseAsAdmin(id, data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  // Admin: Delete any exercise (including global)
  fastify.delete('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any;
    await exerciseService.deleteExerciseAsAdmin(id);
    reply.status(204).send();
  });
}
