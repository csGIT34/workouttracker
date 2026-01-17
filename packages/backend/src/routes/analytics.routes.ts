import { FastifyInstance } from 'fastify';
import { analyticsService } from '../services/analytics.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { TimeRange } from '@workout-tracker/shared';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Get exercise progression history
  fastify.get('/exercise/:id/progression', async (request) => {
    const { id } = request.params as any;
    const { range = '3months' } = request.query as any;
    return analyticsService.getExerciseProgressionHistory(
      request.user!.userId,
      id,
      range as TimeRange
    );
  });

  // Get total volume by week
  fastify.get('/volume/weekly', async (request) => {
    const { weeks = 12 } = request.query as any;
    return analyticsService.getTotalVolumeByWeek(
      request.user!.userId,
      Number(weeks)
    );
  });

  // Get workout frequency
  fastify.get('/frequency', async (request) => {
    const { weeks = 12 } = request.query as any;
    return analyticsService.getWorkoutFrequency(
      request.user!.userId,
      Number(weeks)
    );
  });

  // Get muscle group distribution
  fastify.get('/muscle-distribution', async (request) => {
    const { range = '3months' } = request.query as any;
    return analyticsService.getMuscleGroupDistribution(
      request.user!.userId,
      range as TimeRange
    );
  });

  // Get personal records
  fastify.get('/personal-records', async (request) => {
    return analyticsService.getPersonalRecords(request.user!.userId);
  });
}
