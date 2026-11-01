import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { ZodError, z } from "zod";
import {
  CategoryServiceError,
  createCategory,
  createSubCategory,
  getAllCategories,
  getVisibleCategories,
  updateCategory,
  updateSubCategory,
} from "./category.service";

const nameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer");
const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120, "Slug must be 120 characters or fewer")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and single hyphens");

const idParamsSchema = z.object({ id: z.cuid() }).strict();
const categoryIdParamsSchema = z.object({ categoryId: z.cuid() }).strict();

const createCategorySchema = z.object({
  name: nameSchema,
  slug: slugSchema,
}).strict();

const updateCategorySchema = z.union([
  z.object({ name: nameSchema }).strict(),
  z.object({ isVisible: z.boolean() }).strict(),
]);

const createSubCategorySchema = z.object({
  name: nameSchema,
  slug: slugSchema,
}).strict();

const updateSubCategorySchema = z.union([
  z.object({ name: nameSchema }).strict(),
  z.object({ isVisible: z.boolean() }).strict(),
]);

const sendCategoryError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: error.issues[0]?.message || "Invalid category request",
    });
  }

  if (error instanceof CategoryServiceError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A category or subcategory with that unique value already exists",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Category or subcategory not found" });
    }
  }

  console.error("Category management error:", error);
  return res.status(500).json({ success: false, message: fallback });
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const sort = req.query.sort === "name" ? "name" : "sequence";
    const categories = await getVisibleCategories(sort);
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    console.error("Get categories error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};

export const getAdminCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await getAllCategories("sequence");
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return sendCategoryError(res, error, "Failed to fetch categories");
  }
};

export const createCategoryHandler = async (req: Request, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await createCategory(data);
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return sendCategoryError(res, error, "Failed to create category");
  }
};

export const updateCategoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = idParamsSchema.parse(req.params);
    const data = updateCategorySchema.parse(req.body);
    const category = await updateCategory(id, data);
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return sendCategoryError(res, error, "Failed to update category");
  }
};

export const createSubCategoryHandler = async (req: Request, res: Response) => {
  try {
    const { categoryId } = categoryIdParamsSchema.parse(req.params);
    const data = createSubCategorySchema.parse(req.body);
    const subCategory = await createSubCategory(categoryId, data);
    return res.status(201).json({ success: true, data: subCategory });
  } catch (error) {
    return sendCategoryError(res, error, "Failed to create subcategory");
  }
};

export const updateSubCategoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = idParamsSchema.parse(req.params);
    const data = updateSubCategorySchema.parse(req.body);
    const subCategory = await updateSubCategory(id, data);
    return res.status(200).json({ success: true, data: subCategory });
  } catch (error) {
    return sendCategoryError(res, error, "Failed to update subcategory");
  }
};
