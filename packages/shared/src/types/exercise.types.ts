export enum MuscleGroup {
  CHEST = 'CHEST',
  BACK = 'BACK',
  SHOULDERS = 'SHOULDERS',
  LEGS = 'LEGS',
  ARMS = 'ARMS',
  CORE = 'CORE'
}

export enum ExerciseCategory {
  BARBELL = 'BARBELL',
  DUMBBELL = 'DUMBBELL',
  MACHINE = 'MACHINE',
  BODYWEIGHT = 'BODYWEIGHT',
  CABLE = 'CABLE'
}

export enum ExerciseType {
  STRENGTH = 'STRENGTH',
  CARDIO = 'CARDIO'
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExerciseDto {
  name: string;
  description?: string;
  muscleGroupId?: string;
  categoryId?: string;
  type?: ExerciseType;
}

export interface UpdateExerciseDto {
  name?: string;
  description?: string;
  muscleGroupId?: string;
  categoryId?: string;
  type?: ExerciseType;
}
