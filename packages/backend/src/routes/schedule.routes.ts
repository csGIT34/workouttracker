import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { scheduleService } from '../services/schedule.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const setScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  templateId: z.string().uuid(),
});

export async function scheduleRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Get weekly schedule
  fastify.get('/week', async (request) => {
    return scheduleService.getWeeklySchedule(request.user!.userId);
  });

  // Get today's scheduled workout
  fastify.get('/today', async (request) => {
    return scheduleService.getScheduleForToday(request.user!.userId);
  });

  // Get month schedule (calendar data)
  fastify.get('/month/:year/:month', async (request) => {
    const { year, month } = request.params as any;
    return scheduleService.getMonthSchedule(
      request.user!.userId,
      Number(year),
      Number(month)
    );
  });

  // Set schedule for a day
  fastify.post('/', async (request, reply) => {
    try {
      const data = setScheduleSchema.parse(request.body);
      return scheduleService.setSchedule(request.user!.userId, data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  // Clear schedule for a day
  fastify.delete('/:dayOfWeek', async (request, reply) => {
    const { dayOfWeek } = request.params as any;
    await scheduleService.removeSchedule(request.user!.userId, Number(dayOfWeek));
    reply.status(204).send();
  });
}
