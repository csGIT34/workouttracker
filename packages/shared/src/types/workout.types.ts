export enum WorkoutStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Set {
  id: string;
  workoutExerciseId: string;
  setNumber: number;

  // Strength training fields
  reps?: number;
  weight?: number;
  rpe?: number | null;

  // Cardio fields
  durationMinutes?: number;
  distanceMiles?: number;
  caloriesBurned?: number;

  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  suggestedWeight?: number;
  completed: boolean;
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string;
    category: string;
  };
  sets: Set[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Workout {
  id: string;
  userId: string;
  templateId?: string | null;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  status: WorkoutStatus;
  workoutExercises: WorkoutExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkoutDto {
  name: string;
}

export interface AddExerciseToWorkoutDto {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
}

export interface LogSetDto {
  setNumber: number;
  // Strength fields
  reps?: number;
  weight?: number;
  rpe?: number;
  // Cardio fields
  durationMinutes?: number;
  distanceMiles?: number;
  caloriesBurned?: number;
}

export interface UpdateSetDto {
  // Strength fields
  reps?: number;
  weight?: number;
  rpe?: number;
  // Cardio fields
  durationMinutes?: number;
  distanceMiles?: number;
  caloriesBurned?: number;
  completed?: boolean;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  status: WorkoutStatus;
  exerciseCount: number;
  totalSets: number;
}

export interface SaveWorkoutAsTemplateDto {
  name: string;
  description?: string;
  color?: string;
}
