import { PrismaClient, ExerciseType } from '@prisma/client';

const prisma = new PrismaClient();

async function generateHistoricalData() {
  console.log('🏋️  Generating historical workout data...\n');

  // Get user email from command line argument
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.log('❌ Please provide a user email as an argument:');
    console.log('   npm run generate-history <email>\n');

    console.log('📋 Available users:');
    const users = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.firstName} ${u.lastName})`);
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.log(`❌ User not found: ${userEmail}\n`);
    console.log('📋 Available users:');
    const users = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.firstName} ${u.lastName})`);
    });
    return;
  }

  console.log(`📝 Generating data for user: ${user.email}\n`);

  // Get user's templates
  let templates = await prisma.workoutTemplate.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      templateExercises: {
        include: {
          exercise: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
  });

  if (templates.length === 0) {
    console.log('📝 No templates found. Creating default templates...\n');

    // Get exercises to populate templates
    const chestExercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: { name: 'CHEST' },
        type: ExerciseType.STRENGTH,
      },
      take: 4,
    });

    const backExercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: { name: 'BACK' },
        type: ExerciseType.STRENGTH,
      },
      take: 4,
    });

    const legsExercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: { name: 'LEGS' },
        type: ExerciseType.STRENGTH,
      },
      take: 4,
    });

    const armsExercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: { name: 'ARMS' },
        type: ExerciseType.STRENGTH,
      },
      take: 4,
    });

    const shouldersExercises = await prisma.exercise.findMany({
      where: {
        muscleGroup: { name: 'SHOULDERS' },
        type: ExerciseType.STRENGTH,
      },
      take: 3,
    });

    // Create Push template (Chest, Shoulders, Triceps)
    const pushTemplate = await prisma.workoutTemplate.create({
      data: {
        userId: user.id,
        name: 'Push Day',
        description: 'Chest, Shoulders, and Triceps',
        color: '#3b82f6',
        isActive: true,
      },
    });

    let orderIndex = 0;
    for (const exercise of chestExercises.slice(0, 2)) {
      await prisma.templateExercise.create({
        data: {
          templateId: pushTemplate.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
          targetSets: 3,
          targetReps: 10,
        },
      });
    }

    for (const exercise of shouldersExercises.slice(0, 2)) {
      await prisma.templateExercise.create({
        data: {
          templateId: pushTemplate.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
          targetSets: 3,
          targetReps: 10,
        },
      });
    }

    const tricepExercises = armsExercises.filter(e =>
      e.name.toLowerCase().includes('tricep') || e.name.toLowerCase().includes('dip')
    );
    for (const exercise of tricepExercises.slice(0, 1)) {
      await prisma.templateExercise.create({
        data: {
          templateId: pushTemplate.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
          targetSets: 3,
          targetReps: 12,
        },
      });
    }

    console.log(`✅ Created template: ${pushTemplate.name}`);

    // Create Pull template (Back, Biceps)
    const pullTemplate = await prisma.workoutTemplate.create({
      data: {
        userId: user.id,
        name: 'Pull Day',
        description: 'Back and Biceps',
        color: '#10b981',
        isActive: true,
      },
    });

    orderIndex = 0;
    for (const exercise of backExercises.slice(0, 3)) {
      await prisma.templateExercise.create({
        data: {
          templateId: pullTemplate.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
          targetSets: 3,
          targetReps: 10,
        },
      });
    }

    const bicepExercises = armsExercises.filter(e =>
      e.name.toLowerCase().includes('curl')
    );
    for (const exercise of bicepExercises.slice(0, 2)) {
      await prisma.templateExercise.create({
        data: {
          templateId: pullTemplate.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
          targetSets: 3,
          targetReps: 12,
        },
      });
    }

    console.log(`✅ Created template: ${pullTemplate.name}`);

    // Create Legs template
    const legsTemplate = await prisma.workoutTemplate.create({
      data: {
        userId: user.id,
        name: 'Leg Day',
        description: 'Quadriceps, Hamstrings, and Calves',
        color: '#f59e0b',
        isActive: true,
      },
    });

    orderIndex = 0;
    for (const exercise of legsExercises.slice(0, 4)) {
      await prisma.templateExercise.create({
        data: {
          templateId: legsTemplate.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
          targetSets: 4,
          targetReps: 10,
        },
      });
    }

    console.log(`✅ Created template: ${legsTemplate.name}`);

    console.log('\n📋 Fetching created templates...\n');

    // Re-fetch templates
    templates = await prisma.workoutTemplate.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        templateExercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });
  }

  console.log(`📋 Found ${templates.length} template(s):`);
  templates.forEach(t => {
    console.log(`   - ${t.name} (${t.templateExercises.length} exercises)`);
  });
  console.log();

  // Generate workouts for the past 30 days
  const today = new Date();
  const daysToGenerate = 30;
  const workoutsPerWeek = 4; // Average 4 workouts per week
  const totalWorkouts = Math.floor((daysToGenerate / 7) * workoutsPerWeek);

  console.log(`🎯 Target: ${totalWorkouts} workouts over ${daysToGenerate} days\n`);

  let workoutsCreated = 0;

  // Distribute workouts evenly across the month
  const workoutDates: Date[] = [];
  for (let i = 0; i < totalWorkouts; i++) {
    const daysAgo = Math.floor((i / totalWorkouts) * daysToGenerate);
    const workoutDate = new Date(today);
    workoutDate.setDate(today.getDate() - daysAgo);
    workoutDate.setHours(10 + Math.floor(Math.random() * 6), 0, 0, 0); // Random time between 10am-4pm
    workoutDates.push(workoutDate);
  }

  // Reverse to go chronologically
  workoutDates.reverse();

  // Track progression for each exercise (starting weights)
  const exerciseProgression = new Map<string, { weight: number; reps: number }>();

  for (let i = 0; i < workoutDates.length; i++) {
    const workoutDate = workoutDates[i];
    const template = templates[i % templates.length]; // Rotate through templates

    // Skip if template has no exercises
    if (template.templateExercises.length === 0) {
      continue;
    }

    console.log(`Creating workout ${i + 1}/${workoutDates.length}: ${template.name} on ${workoutDate.toLocaleDateString()}`);

    // Create the workout
    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        name: `${template.name} - ${workoutDate.toLocaleDateString()}`,
        status: 'COMPLETED',
        startedAt: workoutDate,
        completedAt: new Date(workoutDate.getTime() + 60 * 60 * 1000), // 1 hour duration
      },
    });

    // Add exercises from template
    for (const templateExercise of template.templateExercises) {
      // Only process strength exercises
      if (templateExercise.exercise.type !== ExerciseType.STRENGTH) {
        continue;
      }

      const exerciseId = templateExercise.exerciseId;

      // Initialize progression if not exists
      if (!exerciseProgression.has(exerciseId)) {
        // Starting weights based on exercise type
        let baseWeight = 45; // Default starting weight
        const exerciseName = templateExercise.exercise.name.toLowerCase();

        if (exerciseName.includes('squat') || exerciseName.includes('deadlift')) {
          baseWeight = 135; // Higher starting weight for compound leg exercises
        } else if (exerciseName.includes('bench press') || exerciseName.includes('row')) {
          baseWeight = 95;
        } else if (exerciseName.includes('shoulder press') || exerciseName.includes('overhead press')) {
          baseWeight = 65;
        } else if (exerciseName.includes('curl') || exerciseName.includes('lateral') || exerciseName.includes('tricep')) {
          baseWeight = 20; // Lower for isolation exercises
        } else if (exerciseName.includes('leg press')) {
          baseWeight = 180;
        } else if (exerciseName.includes('leg extension') || exerciseName.includes('leg curl')) {
          baseWeight = 70;
        }

        exerciseProgression.set(exerciseId, {
          weight: baseWeight,
          reps: 8,
        });
      }

      // Create workout exercise
      const workoutExercise = await prisma.workoutExercise.create({
        data: {
          workoutId: workout.id,
          exerciseId: exerciseId,
          targetSets: templateExercise.targetSets || 3,
          targetReps: templateExercise.targetReps || 10,
          orderIndex: templateExercise.orderIndex,
          completed: true,
        },
      });

      // Get current progression
      const progression = exerciseProgression.get(exerciseId)!;
      const targetSets = templateExercise.targetSets || 3;

      // Create sets with slight variation and progression
      for (let setNum = 0; setNum < targetSets; setNum++) {
        // Warm-up set (lighter)
        const isWarmup = setNum === 0 && targetSets > 1;
        const weight = isWarmup
          ? Math.round(progression.weight * 0.7)
          : progression.weight;

        // Reps decrease slightly as sets progress (fatigue)
        const reps = progression.reps - setNum;

        await prisma.set.create({
          data: {
            workoutExerciseId: workoutExercise.id,
            setNumber: setNum + 1,
            weight: weight,
            reps: Math.max(reps, 5), // Minimum 5 reps
            completed: true,
            rpe: 7 + setNum, // RPE increases with sets
          },
        });
      }

      // Increase weight every 3-4 workouts for progression
      if (i > 0 && i % 3 === 0) {
        const currentProgression = exerciseProgression.get(exerciseId)!;
        const weightIncrement = currentProgression.weight >= 100 ? 5 : 2.5;
        exerciseProgression.set(exerciseId, {
          weight: currentProgression.weight + weightIncrement,
          reps: currentProgression.reps,
        });
      }
    }

    workoutsCreated++;
  }

  console.log(`\n✅ Successfully created ${workoutsCreated} workouts with progression data!`);
  console.log(`\n📊 Progression summary:`);

  for (const [exerciseId, progression] of exerciseProgression.entries()) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
    if (exercise) {
      console.log(`   ${exercise.name}: ${progression.weight} lbs × ${progression.reps} reps`);
    }
  }

  console.log(`\n🎉 Historical data generation complete!`);
}

generateHistoricalData()
  .catch((e) => {
    console.error('❌ Error generating historical data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
