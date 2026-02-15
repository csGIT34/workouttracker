import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExerciseData {
  name: string;
  description: string;
  muscleGroup: string | null;
  category: string | null;
  type: 'STRENGTH' | 'CARDIO';
  metValue: number | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  force: 'PUSH' | 'PULL' | 'STATIC' | null;
  mechanic: 'COMPOUND' | 'ISOLATION' | null;
  secondaryMuscles: string[] | null;
  specificMuscle: string | null;
  videoUrl: string | null;
  aliases: string[] | null;
  instructions: string | null;
}

async function main() {
  console.log('Seeding database...');

  // Seed muscle groups
  const muscleGroups = ['CHEST', 'BACK', 'SHOULDERS', 'LEGS', 'ARMS', 'CORE'];
  for (const name of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Muscle groups seeded');

  // Seed exercise categories
  const categories = ['BARBELL', 'DUMBBELL', 'MACHINE', 'BODYWEIGHT', 'CABLE'];
  for (const name of categories) {
    await prisma.exerciseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Exercise categories seeded');

  // Load exercise data from JSON
  const exerciseDataPath = join(__dirname, 'exercise-data.json');
  const exercises: ExerciseData[] = JSON.parse(readFileSync(exerciseDataPath, 'utf-8'));
  console.log(`Loaded ${exercises.length} exercises from exercise-data.json`);

  // Build lookup maps for muscle groups and categories
  const muscleGroupMap = new Map<string, string>();
  const categoryMap = new Map<string, string>();

  const allMuscleGroups = await prisma.muscleGroup.findMany();
  for (const mg of allMuscleGroups) {
    muscleGroupMap.set(mg.name, mg.id);
  }

  const allCategories = await prisma.exerciseCategory.findMany();
  for (const cat of allCategories) {
    categoryMap.set(cat.name, cat.id);
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name },
    });

    const muscleGroupId = exercise.muscleGroup ? muscleGroupMap.get(exercise.muscleGroup) : undefined;
    const categoryId = exercise.category ? categoryMap.get(exercise.category) : undefined;

    const data = {
      name: exercise.name,
      description: exercise.description,
      type: exercise.type || 'STRENGTH',
      metValue: exercise.metValue ?? undefined,
      muscleGroupId: muscleGroupId ?? undefined,
      categoryId: categoryId ?? undefined,
      difficulty: exercise.difficulty ?? undefined,
      force: exercise.force ?? undefined,
      mechanic: exercise.mechanic ?? undefined,
      secondaryMuscles: exercise.secondaryMuscles ? JSON.stringify(exercise.secondaryMuscles) : undefined,
      specificMuscle: exercise.specificMuscle ?? undefined,
      videoUrl: exercise.videoUrl ?? undefined,
      aliases: exercise.aliases ? JSON.stringify(exercise.aliases) : undefined,
      instructions: exercise.instructions ?? undefined,
    };

    if (!existing) {
      await prisma.exercise.create({ data });
      createdCount++;
    } else {
      await prisma.exercise.update({
        where: { id: existing.id },
        data,
      });
      updatedCount++;
    }
  }

  console.log(`Seed complete: ${createdCount} exercises created, ${updatedCount} exercises updated.`);

  const totalExercises = await prisma.exercise.count();
  console.log(`Total exercises in database: ${totalExercises}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
