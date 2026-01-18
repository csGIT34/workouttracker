import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtPayload } from '@workout-tracker/shared';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch (error) {
    // Don't fail if no token - just continue without user
    // request.user remains undefined
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;

    if (decoded.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Forbidden: Admin access required' });
      return;
    }
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
