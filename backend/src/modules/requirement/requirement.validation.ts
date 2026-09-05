import { z } from "zod";

// ── Requirement enums ────────────────────────────────────────────────────────

const employmentTypeEnum = z.enum([
  "PERMANENT",
  "CONTRACT",
  "FREELANCE",
  "PROJECT_BASED",
  "PART_TIME",
  "FULL_TIME",
  "TEMPORARY",
  "ON_CALL",
  "INTERNSHIP",
]);

const workModeEnum = z.enum([
  "ON_SITE",
  "REMOTE",
]);

const workGeographyEnum = z.enum([
  "DOMESTIC",
  "INTERNATIONAL",
]);

const assignmentModeEnum = z.enum([
  "PREFERRED_SINGLE",
  "SINGLE_WITH_BACKUP",
  "BULK_WORKFORCE",
]);

// ── Create ────────────────────────────────────────────────────────────────────

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

  employmentTypes: z
    .array(employmentTypeEnum)
    .default([]),

  workMode: workModeEnum.optional(),

  workGeography: workGeographyEnum.optional(),

  preferredCountries: z
    .array(z.string().min(2))
    .default([]),

  assignmentMode: assignmentModeEnum
    .default("SINGLE_WITH_BACKUP"),

  backupPoolSize: z
    .number()
    .int()
    .min(0)
    .default(10),

  preferredWorkerProfileId: z
    .string()
    .min(1)
    .optional(),
});

// ── Update ────────────────────────────────────────────────────────────────────

export const updateRequirementSchema =
  createRequirementSchema.partial();

export type CreateRequirementInput =
  z.infer<typeof createRequirementSchema>;

export type UpdateRequirementInput =
  z.infer<typeof updateRequirementSchema>;