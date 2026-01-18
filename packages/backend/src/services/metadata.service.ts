import { prisma } from '../lib/prisma.js';

export class MetadataService {
  // ===== MUSCLE GROUPS =====

  async getAllMuscleGroups() {
    return prisma.muscleGroup.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createMuscleGroup(name: string) {
    const existing = await prisma.muscleGroup.findUnique({
      where: { name },
    });

    if (existing) {
      throw new Error('Muscle group already exists');
    }

    return prisma.muscleGroup.create({
      data: { name: name.toUpperCase() },
    });
  }

  async updateMuscleGroup(id: string, name: string) {
    const existing = await prisma.muscleGroup.findUnique({
      where: { name },
    });

    if (existing && existing.id !== id) {
      throw new Error('Muscle group with this name already exists');
    }

    return prisma.muscleGroup.update({
      where: { id },
      data: { name: name.toUpperCase() },
    });
  }

  async deleteMuscleGroup(id: string) {
    // Check if any exercises use this muscle group
    const exerciseCount = await prisma.exercise.count({
      where: { muscleGroupId: id },
    });

    return prisma.muscleGroup.delete({
      where: { id },
    });
  }

  // ===== EXERCISE CATEGORIES =====

  async getAllCategories() {
    return prisma.exerciseCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string) {
    const existing = await prisma.exerciseCategory.findUnique({
      where: { name },
    });

    if (existing) {
      throw new Error('Category already exists');
    }

    return prisma.exerciseCategory.create({
      data: { name: name.toUpperCase() },
    });
  }

  async updateCategory(id: string, name: string) {
    const existing = await prisma.exerciseCategory.findUnique({
      where: { name },
    });

    if (existing && existing.id !== id) {
      throw new Error('Category with this name already exists');
    }

    return prisma.exerciseCategory.update({
      where: { id },
      data: { name: name.toUpperCase() },
    });
  }

  async deleteCategory(id: string) {
    // Check if any exercises use this category
    const exerciseCount = await prisma.exercise.count({
      where: { categoryId: id },
    });

    return prisma.exerciseCategory.delete({
      where: { id },
    });
  }

  // ===== USER MANAGEMENT =====

  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }
}

export const metadataService = new MetadataService();
