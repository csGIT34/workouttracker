import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const updateProfileSchema = z.object({
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['LBS', 'KG']).optional(),
  height: z.number().positive().optional(),
  heightUnit: z.enum(['INCHES', 'CM']).optional(),
  age: z.number().int().positive().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  // Get user profile
  fastify.get(
    '/profile',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      try {
        if (!request.user?.userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        const userId = request.user.userId;

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            weight: true,
            weightUnit: true,
            height: true,
            heightUnit: true,
            age: true,
            gender: true,
            profileCompletedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        return reply.send(user);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return reply.status(500).send({ error: 'Failed to fetch user profile' });
      }
    }
  );

  // Update user profile
  fastify.patch(
    '/profile',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      try {
        if (!request.user?.userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        const userId = request.user.userId;
        const data = updateProfileSchema.parse(request.body);

        // Check if this is the first time completing profile (weight is being set)
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { weight: true, profileCompletedAt: true },
        });

        const isFirstTimeCompletingProfile = !currentUser?.weight && data.weight && !currentUser?.profileCompletedAt;

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
            ...(isFirstTimeCompletingProfile && { profileCompletedAt: new Date() }),
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            weight: true,
            weightUnit: true,
            height: true,
            heightUnit: true,
            age: true,
            gender: true,
            profileCompletedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.send(updatedUser);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid profile data', details: error.errors });
        }
        console.error('Error updating user profile:', error);
        return reply.status(500).send({ error: 'Failed to update user profile' });
      }
    }
  );
}
