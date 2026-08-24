import { z } from "zod";

export const createRequirementSchema = z.object({
  categoryId: z
    .string()
    .min(1, "Category is required"),

  subCategoryId: z
    .string()
    .min(1, "Work type is required"),

  city: z
    .string()
    .min(2, "City is required"),

  state: z
    .string()
    .optional(),

  address: z
    .string()
    .optional(),

  shiftTiming: z
    .string()
    .optional(),

  salaryBudget: z
    .number()
    .positive()
    .optional(),

  minExperience: z
    .number()
    .min(0)
    .default(0),

  joiningDate: z
    .string()
    .min(1, "Joining date is required"),

  requiredWorkerCount: z
    .number()
    .int()
    .positive()
    .default(1),
});

export const updateRequirementSchema =
  createRequirementSchema.partial();

export type CreateRequirementInput = z.infer<
  typeof createRequirementSchema
>;

export type UpdateRequirementInput = z.infer<
  typeof updateRequirementSchema
>;