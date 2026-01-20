import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { RegisterDto, LoginDto } from '@workout-tracker/shared';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const isSecureCookie = process.env.FRONTEND_URL?.startsWith('https') ?? false;

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body) as RegisterDto;
      const result = await authService.register(data);

      // Generate tokens
      const accessToken = fastify.jwt.sign({
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
      });

      const refreshToken = fastify.jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        }
      );

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        accessToken,
        refreshToken,
        user: result.user,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        reply.status(400).send({ error: (error as Error).message });
      }
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body) as LoginDto;
      const result = await authService.login(data);

      // Generate tokens
      const accessToken = fastify.jwt.sign({
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
      });

      const refreshToken = fastify.jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        }
      );

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        accessToken,
        refreshToken,
        user: result.user,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation error', details: error.errors });
      } else {
        reply.status(401).send({ error: 'Invalid credentials' });
      }
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const user = await authService.getUserById(request.user!.userId);
      return user;
    } catch (error) {
      reply.status(404).send({ error: (error as Error).message });
    }
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.cookies;

      if (!refreshToken) {
        reply.status(401).send({ error: 'Refresh token not found' });
        return;
      }

      const decoded = fastify.jwt.verify(refreshToken);
      const userId = (decoded as any).userId;
      const email = (decoded as any).email;
      const role = (decoded as any).role;

      // Generate new access token
      const newAccessToken = fastify.jwt.sign({
        userId,
        email,
        role,
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  });
}
