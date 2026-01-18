import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Check if exercises already exist
  const existingExercisesCount = await prisma.exercise.count();

  // Seed exercises (will only create if they don't exist)
  const exercises = [
    // Chest - Barbell
    {
      name: 'Barbell Bench Press',
      description: 'Classic compound chest exercise',
      muscleGroup: 'CHEST',
      category: 'BARBELL',
    },
    {
      name: 'Incline Barbell Bench Press',
      description: 'Targets upper chest',
      muscleGroup: 'CHEST',
      category: 'BARBELL',
    },
    {
      name: 'Decline Barbell Bench Press',
      description: 'Targets lower chest',
      muscleGroup: 'CHEST',
      category: 'BARBELL',
    },

    // Chest - Dumbbell
    {
      name: 'Dumbbell Bench Press',
      description: 'Greater range of motion than barbell',
      muscleGroup: 'CHEST',
      category: 'DUMBBELL',
    },
    {
      name: 'Incline Dumbbell Press',
      description: 'Upper chest focus with dumbbells',
      muscleGroup: 'CHEST',
      category: 'DUMBBELL',
    },
    {
      name: 'Dumbbell Flyes',
      description: 'Isolation exercise for chest',
      muscleGroup: 'CHEST',
      category: 'DUMBBELL',
    },

    // Chest - Cable/Bodyweight
    {
      name: 'Push-ups',
      description: 'Bodyweight chest exercise',
      muscleGroup: 'CHEST',
      category: 'BODYWEIGHT',
    },
    {
      name: 'Cable Flyes',
      description: 'Constant tension on chest',
      muscleGroup: 'CHEST',
      category: 'CABLE',
    },

    // Back - Barbell
    {
      name: 'Barbell Deadlift',
      description: 'Compound full-body exercise',
      muscleGroup: 'BACK',
      category: 'BARBELL',
    },
    {
      name: 'Barbell Row',
      description: 'Horizontal pulling movement',
      muscleGroup: 'BACK',
      category: 'BARBELL',
    },

    // Back - Dumbbell/Bodyweight
    {
      name: 'Dumbbell Row',
      description: 'Unilateral back exercise',
      muscleGroup: 'BACK',
      category: 'DUMBBELL',
    },
    {
      name: 'Pull-ups',
      description: 'Vertical pulling bodyweight exercise',
      muscleGroup: 'BACK',
      category: 'BODYWEIGHT',
    },
    {
      name: 'Chin-ups',
      description: 'Underhand grip pull-up variation',
      muscleGroup: 'BACK',
      category: 'BODYWEIGHT',
    },

    // Back - Cable/Machine
    {
      name: 'Lat Pulldown',
      description: 'Machine alternative to pull-ups',
      muscleGroup: 'BACK',
      category: 'MACHINE',
    },
    {
      name: 'Cable Row',
      description: 'Seated rowing movement',
      muscleGroup: 'BACK',
      category: 'CABLE',
    },

    // Shoulders - Barbell
    {
      name: 'Overhead Press',
      description: 'Compound shoulder press',
      muscleGroup: 'SHOULDERS',
      category: 'BARBELL',
    },

    // Shoulders - Dumbbell
    {
      name: 'Dumbbell Shoulder Press',
      description: 'Overhead press with dumbbells',
      muscleGroup: 'SHOULDERS',
      category: 'DUMBBELL',
    },
    {
      name: 'Lateral Raises',
      description: 'Isolation for side delts',
      muscleGroup: 'SHOULDERS',
      category: 'DUMBBELL',
    },
    {
      name: 'Front Raises',
      description: 'Isolation for front delts',
      muscleGroup: 'SHOULDERS',
      category: 'DUMBBELL',
    },
    {
      name: 'Rear Delt Flyes',
      description: 'Targets rear deltoids',
      muscleGroup: 'SHOULDERS',
      category: 'DUMBBELL',
    },

    // Legs - Barbell
    {
      name: 'Barbell Squat',
      description: 'King of leg exercises',
      muscleGroup: 'LEGS',
      category: 'BARBELL',
    },
    {
      name: 'Front Squat',
      description: 'Quad-focused squat variation',
      muscleGroup: 'LEGS',
      category: 'BARBELL',
    },
    {
      name: 'Romanian Deadlift',
      description: 'Hamstring and glute focus',
      muscleGroup: 'LEGS',
      category: 'BARBELL',
    },
    {
      name: 'Barbell Lunges',
      description: 'Unilateral leg exercise',
      muscleGroup: 'LEGS',
      category: 'BARBELL',
    },

    // Legs - Machine/Bodyweight
    {
      name: 'Leg Press',
      description: 'Machine-based leg exercise',
      muscleGroup: 'LEGS',
      category: 'MACHINE',
    },
    {
      name: 'Leg Extension',
      description: 'Quad isolation',
      muscleGroup: 'LEGS',
      category: 'MACHINE',
    },
    {
      name: 'Leg Curl',
      description: 'Hamstring isolation',
      muscleGroup: 'LEGS',
      category: 'MACHINE',
    },
    {
      name: 'Calf Raises',
      description: 'Targets calf muscles',
      muscleGroup: 'LEGS',
      category: 'MACHINE',
    },

    // Arms - Barbell
    {
      name: 'Barbell Curl',
      description: 'Classic bicep exercise',
      muscleGroup: 'ARMS',
      category: 'BARBELL',
    },
    {
      name: 'Close-Grip Bench Press',
      description: 'Tricep-focused pressing movement',
      muscleGroup: 'ARMS',
      category: 'BARBELL',
    },

    // Arms - Dumbbell
    {
      name: 'Dumbbell Curl',
      description: 'Bicep isolation with dumbbells',
      muscleGroup: 'ARMS',
      category: 'DUMBBELL',
    },
    {
      name: 'Hammer Curl',
      description: 'Targets brachialis',
      muscleGroup: 'ARMS',
      category: 'DUMBBELL',
    },
    {
      name: 'Tricep Kickback',
      description: 'Isolation for triceps',
      muscleGroup: 'ARMS',
      category: 'DUMBBELL',
    },
    {
      name: 'Overhead Tricep Extension',
      description: 'Long head tricep focus',
      muscleGroup: 'ARMS',
      category: 'DUMBBELL',
    },

    // Arms - Cable/Bodyweight
    {
      name: 'Cable Curl',
      description: 'Constant tension bicep curl',
      muscleGroup: 'ARMS',
      category: 'CABLE',
    },
    {
      name: 'Tricep Pushdown',
      description: 'Cable tricep isolation',
      muscleGroup: 'ARMS',
      category: 'CABLE',
    },
    {
      name: 'Dips',
      description: 'Bodyweight tricep exercise',
      muscleGroup: 'ARMS',
      category: 'BODYWEIGHT',
    },

    // Core
    {
      name: 'Plank',
      description: 'Isometric core exercise',
      muscleGroup: 'CORE',
      category: 'BODYWEIGHT',
    },
    {
      name: 'Crunches',
      description: 'Ab isolation',
      muscleGroup: 'CORE',
      category: 'BODYWEIGHT',
    },
    {
      name: 'Russian Twists',
      description: 'Oblique focused movement',
      muscleGroup: 'CORE',
      category: 'BODYWEIGHT',
    },
    {
      name: 'Leg Raises',
      description: 'Lower ab focus',
      muscleGroup: 'CORE',
      category: 'BODYWEIGHT',
    },
    {
      name: 'Cable Woodchoppers',
      description: 'Rotational core exercise',
      muscleGroup: 'CORE',
      category: 'CABLE',
    },

    // Cardio exercises with MET values
    {
      name: 'Running',
      description: 'Outdoor or treadmill running',
      type: 'CARDIO',
      metValue: 9.0,
    },
    {
      name: 'Cycling',
      description: 'Stationary bike or outdoor cycling',
      type: 'CARDIO',
      metValue: 7.5,
    },
    {
      name: 'Walking',
      description: 'Brisk walking or power walking',
      type: 'CARDIO',
      metValue: 4.0,
    },
    {
      name: 'Swimming',
      description: 'Freestyle, backstroke, or other swimming styles',
      type: 'CARDIO',
      metValue: 8.0,
    },
    {
      name: 'Rowing',
      description: 'Rowing machine or water rowing',
      type: 'CARDIO',
      metValue: 8.5,
    },
    {
      name: 'Elliptical',
      description: 'Elliptical machine cardio',
      type: 'CARDIO',
      metValue: 5.0,
    },
    {
      name: 'Jump Rope',
      description: 'Skipping rope cardio exercise',
      type: 'CARDIO',
      metValue: 11.0,
    },
    {
      name: 'Stair Climbing',
      description: 'Stair machine or actual stairs',
      type: 'CARDIO',
      metValue: 8.0,
    },
    {
      name: 'HIIT',
      description: 'High-intensity interval training',
      type: 'CARDIO',
      metValue: 10.0,
    },
    {
      name: 'Boxing',
      description: 'Heavy bag work or boxing drills',
      type: 'CARDIO',
      metValue: 9.0,
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;

  for (const exercise of exercises) {
    // Check if exercise already exists by name
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name },
    });

    if (!existing) {
      await prisma.exercise.create({
        data: exercise,
      });
      createdCount++;
    } else {
      // Update existing exercise with new fields (like metValue and description)
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          description: exercise.description,
          metValue: exercise.metValue,
        },
      });
      updatedCount++;
    }
  }

  console.log(`Seed complete: ${createdCount} exercises created, ${updatedCount} exercises updated.`);

  if (existingExercisesCount === 0) {
    console.log(`Total exercises in database: ${exercises.length}`);
  } else {
    const totalExercises = await prisma.exercise.count();
    console.log(`Total exercises in database: ${totalExercises}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
