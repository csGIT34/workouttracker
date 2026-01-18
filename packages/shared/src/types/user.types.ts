export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN'
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const WeightUnit = {
  LBS: 'LBS',
  KG: 'KG'
} as const;
export type WeightUnit = (typeof WeightUnit)[keyof typeof WeightUnit];

export const HeightUnit = {
  INCHES: 'INCHES',
  CM: 'CM'
} as const;
export type HeightUnit = (typeof HeightUnit)[keyof typeof HeightUnit];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY'
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;

  // Biometric fields for calorie tracking
  weight?: number;
  weightUnit: WeightUnit;
  height?: number;
  heightUnit: HeightUnit;
  age?: number;
  gender?: Gender;
  profileCompletedAt?: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;

  // Biometric fields
  weight?: number;
  weightUnit: WeightUnit;
  height?: number;
  heightUnit: HeightUnit;
  age?: number;
  gender?: Gender;
  profileCompletedAt?: Date;
}

export interface UpdateProfileDto {
  weight?: number;
  weightUnit?: WeightUnit;
  height?: number;
  heightUnit?: HeightUnit;
  age?: number;
  gender?: Gender;
}
