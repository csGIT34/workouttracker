import { FastifyInstance } from 'fastify';
import { progressionService } from '../services/progression.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

export async function progressionRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Get progression for specific exercise
  fastify.get('/exercises/:exerciseId', async (request) => {
    const { exerciseId } = request.params as any;
    return progressionService.getProgressionForExercise(
      request.user!.userId,
      exerciseId
    );
  });

  // Get all recommendations
  fastify.get('/recommendations', async (request) => {
    return progressionService.getRecommendations(request.user!.userId);
  });

  // Reset progression for specific exercise
  fastify.delete('/exercises/:exerciseId', async (request, reply) => {
    const { exerciseId } = request.params as any;
    await progressionService.resetProgression(request.user!.userId, exerciseId);
    reply.status(204).send();
  });

  // Reset all progressions
  fastify.delete('/', async (request, reply) => {
    await progressionService.resetAllProgressions(request.user!.userId);
    reply.status(204).send();
  });
}
