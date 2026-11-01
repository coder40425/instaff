import prisma from "../../config/prisma";

export class CategoryServiceError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "CategoryServiceError";
  }
}

const subCategoryOrder = { name: "asc" as const };

export const getAllCategories = async (
  sort: "sequence" | "name" = "sequence"
) => {
  return prisma.category.findMany({
    include: {
      subCategories: {
        orderBy: subCategoryOrder,
      },
    },
    orderBy:
      sort === "name"
        ? { name: "asc" }
        : { sequence: "asc" },
  });
};

export const getVisibleCategories = async (
  sort: "sequence" | "name" = "sequence"
) => {
  return prisma.category.findMany({
    where: { isVisible: true },
    include: {
      subCategories: {
        where: { isVisible: true },
        orderBy: subCategoryOrder,
      },
    },
    orderBy:
      sort === "name"
        ? { name: "asc" }
        : { sequence: "asc" },
  });
};

export const createCategory = async (data: { name: string; slug: string }) => {
  const duplicate = await prisma.category.findFirst({
    where: { OR: [{ name: data.name }, { slug: data.slug }] },
    select: { id: true },
  });
  if (duplicate) {
    throw new CategoryServiceError("A category with that name or slug already exists", 409);
  }

  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      isVisible: true,
    },
  });
};

export const updateCategory = async (
  id: string,
  data: { name: string } | { isVisible: boolean }
) => {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new CategoryServiceError("Category not found", 404);

  if ("name" in data) {
    const duplicate = await prisma.category.findFirst({
      where: { name: data.name, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) {
      throw new CategoryServiceError("A category with that name already exists", 409);
    }
  }

  return prisma.category.update({
    where: { id },
    data: "name" in data ? { name: data.name } : { isVisible: data.isVisible },
  });
};

export const createSubCategory = async (
  categoryId: string,
  data: { name: string; slug: string }
) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) throw new CategoryServiceError("Category not found", 404);

  const duplicateSlug = await prisma.subCategory.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (duplicateSlug) {
    throw new CategoryServiceError("A subcategory with that slug already exists", 409);
  }

  return prisma.subCategory.create({
    data: {
      name: data.name,
      slug: data.slug,
      categoryId: category.id,
      isVisible: true,
    },
  });
};

export const updateSubCategory = async (
  id: string,
  data: { name: string } | { isVisible: boolean }
) => {
  const existing = await prisma.subCategory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new CategoryServiceError("Subcategory not found", 404);

  return prisma.subCategory.update({
    where: { id },
    data: "name" in data ? { name: data.name } : { isVisible: data.isVisible },
  });
};
