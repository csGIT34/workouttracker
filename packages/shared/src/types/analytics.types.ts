import { ExerciseType } from './exercise.types.js';

export interface ProgressionDataPoint {
  date: Date;
  avgWeight?: number;
  maxWeight?: number;
  totalVolume?: number;
  avgReps?: number;
  avgDuration?: number;
  totalDistance?: number;
  totalCalories?: number;
}

export interface ExerciseProgressionHistory {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  data: ProgressionDataPoint[];
}

export interface VolumeByWeek {
  weekStart: Date;
  totalVolume: number;
  workoutCount: number;
}

export interface WorkoutFrequency {
  weekStart: Date;
  workoutCount: number;
}

export interface MuscleGroupDistribution {
  muscleGroup: string;
  count: number;
  percentage: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  maxWeight?: number;
  maxDistance?: number;
  bestTime?: number;
  date: Date;
  reps?: number;
}

export type TimeRange = '1month' | '3months' | '6months' | '1year' | 'all';
