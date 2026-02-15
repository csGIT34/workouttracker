export const MuscleGroup = {
  CHEST: 'CHEST',
  BACK: 'BACK',
  SHOULDERS: 'SHOULDERS',
  LEGS: 'LEGS',
  ARMS: 'ARMS',
  CORE: 'CORE'
} as const;
export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const ExerciseCategory = {
  BARBELL: 'BARBELL',
  DUMBBELL: 'DUMBBELL',
  MACHINE: 'MACHINE',
  BODYWEIGHT: 'BODYWEIGHT',
  CABLE: 'CABLE'
} as const;
export type ExerciseCategory = (typeof ExerciseCategory)[keyof typeof ExerciseCategory];

export const ExerciseType = {
  STRENGTH: 'STRENGTH',
  CARDIO: 'CARDIO'
} as const;
export type ExerciseType = (typeof ExerciseType)[keyof typeof ExerciseType];

export const Difficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED'
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const Force = {
  PUSH: 'PUSH',
  PULL: 'PULL',
  STATIC: 'STATIC'
} as const;
export type Force = (typeof Force)[keyof typeof Force];

export const Mechanic = {
  COMPOUND: 'COMPOUND',
  ISOLATION: 'ISOLATION'
} as const;
export type Mechanic = (typeof Mechanic)[keyof typeof Mechanic];

export interface MuscleGroupData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseCategoryData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  id: string;
  userId?: string | null;
  name: string;
  description: string | null;
  muscleGroupId?: string | null;
  categoryId?: string | null;
  muscleGroup?: MuscleGroupData | null;
  category?: ExerciseCategoryData | null;
  type: ExerciseType;
  metValue?: number | null;
  difficulty?: Difficulty | null;
  force?: Force | null;
  mechanic?: Mechanic | null;
  secondaryMuscles?: string | null;
  specificMuscle?: string | null;
  videoUrl?: string | null;
  aliases?: string | null;
  instructions?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExerciseDto {
  name: string;
  description?: string;
  muscleGroupId?: string;
  categoryId?: string;
  type?: ExerciseType;
  metValue?: number;
  difficulty?: Difficulty;
  force?: Force;
  mechanic?: Mechanic;
  secondaryMuscles?: string;
  specificMuscle?: string;
  videoUrl?: string;
  aliases?: string;
  instructions?: string;
}

export interface UpdateExerciseDto {
  name?: string;
  description?: string;
  muscleGroupId?: string;
  categoryId?: string;
  type?: ExerciseType;
  metValue?: number;
  difficulty?: Difficulty | null;
  force?: Force | null;
  mechanic?: Mechanic | null;
  secondaryMuscles?: string | null;
  specificMuscle?: string | null;
  videoUrl?: string | null;
  aliases?: string | null;
  instructions?: string | null;
}
