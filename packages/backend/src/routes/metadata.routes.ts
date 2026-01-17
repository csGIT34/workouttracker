import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { metadataService } from '../services/metadata.service.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const nameSchema = z.object({
  name: z.string().min(1),
});

const roleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export async function metadataRoutes(fastify: FastifyInstance) {
  // All routes require admin
  fastify.addHook('preHandler', requireAdmin);

  // ===== MUSCLE GROUPS =====

  fastify.get('/muscle-groups', async () => {
    return metadataService.getAllMuscleGroups();
  });

  fastify.post('/muscle-groups', async (request, reply) => {
    try {
      const { name } = nameSchema.parse(request.body);
      return metadataService.createMuscleGroup(name);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  fastify.put('/muscle-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { name } = nameSchema.parse(request.body);
      return metadataService.updateMuscleGroup(id, name);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  fastify.delete('/muscle-groups/:id', async (request, reply) => {
    const { id } = request.params as any;
    await metadataService.deleteMuscleGroup(id);
    reply.status(204).send();
  });

  // ===== EXERCISE CATEGORIES =====

  fastify.get('/categories', async () => {
    return metadataService.getAllCategories();
  });

  fastify.post('/categories', async (request, reply) => {
    try {
      const { name } = nameSchema.parse(request.body);
      return metadataService.createCategory(name);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  fastify.put('/categories/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { name } = nameSchema.parse(request.body);
      return metadataService.updateCategory(id, name);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });

  fastify.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params as any;
    await metadataService.deleteCategory(id);
    reply.status(204).send();
  });

  // ===== USER MANAGEMENT =====

  fastify.get('/users', async () => {
    return metadataService.getAllUsers();
  });

  fastify.put('/users/:id/role', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { role } = roleSchema.parse(request.body);
      return metadataService.updateUserRole(id, role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        throw error;
      }
    }
  });
}
