export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

import { WeightUnit, HeightUnit, Gender } from './user.types.js';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    weight?: number | null;
    weightUnit: WeightUnit;
    height?: number | null;
    heightUnit: HeightUnit;
    age?: number | null;
    gender?: Gender | null;
    profileCompletedAt?: Date | null;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
