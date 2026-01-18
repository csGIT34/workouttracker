export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum WeightUnit {
  LBS = 'LBS',
  KG = 'KG'
}

export enum HeightUnit {
  INCHES = 'INCHES',
  CM = 'CM'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

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
