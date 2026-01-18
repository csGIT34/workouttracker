import { WorkoutTemplate } from './template.types.js';

export interface WorkoutSchedule {
  id: string;
  userId: string;
  templateId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  isActive: boolean;
  template?: WorkoutTemplate;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySchedule {
  sunday?: WorkoutSchedule;
  monday?: WorkoutSchedule;
  tuesday?: WorkoutSchedule;
  wednesday?: WorkoutSchedule;
  thursday?: WorkoutSchedule;
  friday?: WorkoutSchedule;
  saturday?: WorkoutSchedule;
}

export interface SetScheduleDto {
  dayOfWeek: number;
  templateId: string;
}

export interface MonthScheduleEntry {
  date: Date;
  schedule?: WorkoutSchedule;
  workout?: {
    id: string;
    name: string;
    status: string;
    completedAt: Date | null;
  };
  workouts?: {
    id: string;
    name: string;
    status: string;
    completedAt: Date | null;
    templateId: string | null;
  }[];
}
