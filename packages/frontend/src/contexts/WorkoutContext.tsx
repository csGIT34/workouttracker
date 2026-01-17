import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';
import {
  Workout,
  Exercise,
  CreateWorkoutDto,
  AddExerciseToWorkoutDto,
  LogSetDto,
  UpdateSetDto,
  SaveWorkoutAsTemplateDto,
  WorkoutTemplate,
} from '@workout-tracker/shared';

interface WorkoutContextType {
  currentWorkout: Workout | null;
  setCurrentWorkout: (workout: Workout | null) => void;
  createWorkout: (data: CreateWorkoutDto) => Promise<Workout>;
  getWorkout: (id: string) => Promise<Workout>;
  getWorkouts: (limit?: number, offset?: number) => Promise<{ workouts: Workout[]; total: number }>;
  addExerciseToWorkout: (workoutId: string, data: AddExerciseToWorkoutDto) => Promise<void>;
  logSet: (exerciseId: string, data: LogSetDto) => Promise<void>;
  updateSet: (setId: string, data: UpdateSetDto) => Promise<void>;
  completeSet: (setId: string) => Promise<void>;
  completeExercise: (workoutId: string, exerciseId: string) => Promise<void>;
  completeWorkout: (workoutId: string) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  getExercises: () => Promise<Exercise[]>;
  saveWorkoutAsTemplate: (workoutId: string, data: SaveWorkoutAsTemplateDto) => Promise<WorkoutTemplate>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);

  const createWorkout = async (data: CreateWorkoutDto): Promise<Workout> => {
    const response = await api.post('/api/v1/workouts', data);
    const workout = response.data;
    setCurrentWorkout(workout);
    return workout;
  };

  const getWorkout = async (id: string): Promise<Workout> => {
    const response = await api.get(`/api/v1/workouts/${id}`);
    const workout = response.data;
    setCurrentWorkout(workout);
    return workout;
  };

  const getWorkouts = async (limit = 20, offset = 0) => {
    const response = await api.get('/api/v1/workouts', {
      params: { limit, offset },
    });
    return response.data;
  };

  const addExerciseToWorkout = async (workoutId: string, data: AddExerciseToWorkoutDto) => {
    await api.post(`/api/v1/workouts/${workoutId}/exercises`, data);
    await getWorkout(workoutId);
  };

  const logSet = async (exerciseId: string, data: LogSetDto) => {
    await api.post(`/api/v1/workouts/exercises/${exerciseId}/sets`, data);
    if (currentWorkout) {
      await getWorkout(currentWorkout.id);
    }
  };

  const updateSet = async (setId: string, data: UpdateSetDto) => {
    await api.put(`/api/v1/workouts/sets/${setId}`, data);
    if (currentWorkout) {
      await getWorkout(currentWorkout.id);
    }
  };

  const completeSet = async (setId: string) => {
    await api.patch(`/api/v1/workouts/sets/${setId}/complete`);
    if (currentWorkout) {
      await getWorkout(currentWorkout.id);
    }
  };

  const completeExercise = async (workoutId: string, exerciseId: string) => {
    await api.patch(`/api/v1/workouts/${workoutId}/exercises/${exerciseId}/complete`);
    await getWorkout(workoutId);
  };

  const completeWorkout = async (workoutId: string) => {
    await api.patch(`/api/v1/workouts/${workoutId}/complete`);
    setCurrentWorkout(null);
  };

  const deleteWorkout = async (workoutId: string) => {
    await api.delete(`/api/v1/workouts/${workoutId}`);
    if (currentWorkout?.id === workoutId) {
      setCurrentWorkout(null);
    }
  };

  const getExercises = async (): Promise<Exercise[]> => {
    const response = await api.get('/api/v1/exercises');
    return response.data;
  };

  const saveWorkoutAsTemplate = async (
    workoutId: string,
    data: SaveWorkoutAsTemplateDto
  ): Promise<WorkoutTemplate> => {
    const response = await api.post(`/api/v1/workouts/${workoutId}/save-as-template`, data);
    return response.data;
  };

  return (
    <WorkoutContext.Provider
      value={{
        currentWorkout,
        setCurrentWorkout,
        createWorkout,
        getWorkout,
        getWorkouts,
        addExerciseToWorkout,
        logSet,
        updateSet,
        completeSet,
        completeExercise,
        completeWorkout,
        deleteWorkout,
        getExercises,
        saveWorkoutAsTemplate,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
