import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { RegisterDto, LoginDto, AuthResponse } from '@workout-tracker/shared';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async register(data: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    // Return user data (password will be excluded in controller)
    return {
      accessToken: '', // Will be set in controller
      refreshToken: '', // Will be set in controller
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        weight: user.weight,
        weightUnit: user.weightUnit,
        height: user.height,
        heightUnit: user.heightUnit,
        age: user.age,
        gender: user.gender,
        profileCompletedAt: user.profileCompletedAt,
      },
    };
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      accessToken: '', // Will be set in controller
      refreshToken: '', // Will be set in controller
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        weight: user.weight,
        weightUnit: user.weightUnit,
        height: user.height,
        heightUnit: user.heightUnit,
        age: user.age,
        gender: user.gender,
        profileCompletedAt: user.profileCompletedAt,
      },
    };
  }

  async getUserById(userId: string) {
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
      throw new Error('User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
