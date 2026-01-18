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

  // Get workout streak
  fastify.get('/streak', async (request) => {
    return analyticsService.getWorkoutStreak(request.user!.userId);
  });

  // Get weekly volume comparison
  fastify.get('/volume/comparison', async (request) => {
    return analyticsService.getWeeklyVolumeComparison(request.user!.userId);
  });

  // Get weekly calorie comparison
  fastify.get('/calories/comparison', async (request) => {
    return analyticsService.getWeeklyCalorieComparison(request.user!.userId);
  });

  // Get recent PRs
  fastify.get('/recent-prs', async (request) => {
    const { limit = 5 } = request.query as any;
    return analyticsService.getRecentPRs(request.user!.userId, Number(limit));
  });

  // Get monthly summary
  fastify.get('/monthly-summary', async (request) => {
    return analyticsService.getMonthlySummary(request.user!.userId);
  });

  // Get recent activity
  fastify.get('/recent-activity', async (request) => {
    const { limit = 5 } = request.query as any;
    return analyticsService.getRecentActivity(request.user!.userId, Number(limit));
  });

  // Get cardio distance stats (weekly or monthly)
  fastify.get('/cardio/distance', async (request) => {
    const { period = 'week' } = request.query as any;
    return analyticsService.getCardioDistanceStats(
      request.user!.userId,
      period as 'week' | 'month'
    );
  });
}
