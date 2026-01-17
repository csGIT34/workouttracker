export enum ProgressionRecommendation {
  INCREASE_WEIGHT = 'INCREASE_WEIGHT',
  MORE_REPS = 'MORE_REPS',
  MAINTAIN = 'MAINTAIN'
}

export interface ExerciseProgression {
  id: string;
  userId: string;
  exerciseId: string;
  lastWorkoutId: string;
  avgWeight: number;
  avgReps: number;
  recommendation: ProgressionRecommendation;
  recommendationDetails: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressionData {
  exerciseId: string;
  exerciseName: string;
  lastWorkout: {
    id: string;
    date: Date;
    avgWeight: number;
    avgReps: number;
    completionRate: number;
  };
  recommendation: ProgressionRecommendation;
  recommendationDetails: string;
}
