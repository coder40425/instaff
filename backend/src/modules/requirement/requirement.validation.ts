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

const businessModelEnum = z.enum([
  "REGULAR_EMPLOYMENT",
  "GIG_WORK",
  "BULK_MANPOWER",
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

const shiftTimingEnum = z.enum([
  "DAY",
  "NIGHT",
  "LIVE_IN_24_HOURS",
]);

// ── Create ────────────────────────────────────────────────────────────────────

const requirementFieldsSchema = z.object({
  businessModel: businessModelEnum.default("REGULAR_EMPLOYMENT"),

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

  shiftTiming: shiftTimingEnum.optional(),

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
    .optional(),

  preferredWorkerProfileId: z
    .string()
    .min(1)
    .optional(),
});

const BULK_EMPLOYMENT_TYPES = new Set(["PERMANENT", "CONTRACT", "TEMPORARY"]);

export const createRequirementSchema = requirementFieldsSchema.superRefine((requirement, ctx) => {
  if (requirement.businessModel !== "BULK_MANPOWER") return;

  if (requirement.requiredWorkerCount <= 1) {
    ctx.addIssue({ code: "custom", path: ["requiredWorkerCount"], message: "Bulk Manpower requires at least two workers" });
  }
  if (requirement.assignmentMode !== "BULK_WORKFORCE") {
    ctx.addIssue({ code: "custom", path: ["assignmentMode"], message: "Bulk Manpower must use the bulk workforce assignment pool" });
  }
  if (requirement.employmentTypes.length !== 1 || !BULK_EMPLOYMENT_TYPES.has(requirement.employmentTypes[0])) {
    ctx.addIssue({ code: "custom", path: ["employmentTypes"], message: "Choose one arrangement: Bulk Permanent, Bulk Contract, or Bulk Temporary" });
  }
  if (!requirement.shiftTiming) {
    ctx.addIssue({ code: "custom", path: ["shiftTiming"], message: "Choose the common shift for all workers" });
  }
  if (requirement.city.trim().length < 2) {
    ctx.addIssue({ code: "custom", path: ["city"], message: "Enter a valid work city" });
  }
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(requirement.joiningDate);
  if (!dateMatch) {
    ctx.addIssue({ code: "custom", path: ["joiningDate"], message: "Enter a valid joining date" });
  } else {
    const [, year, month, day] = dateMatch;
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
    if (date.toISOString().slice(0, 10) !== requirement.joiningDate) {
      ctx.addIssue({ code: "custom", path: ["joiningDate"], message: "Enter a valid joining date" });
    }
  }
  if (requirement.preferredWorkerProfileId) {
    ctx.addIssue({ code: "custom", path: ["preferredWorkerProfileId"], message: "Bulk Manpower uses the shared matching pool, not a preferred single worker" });
  }
});

// ── Update ────────────────────────────────────────────────────────────────────

export const updateRequirementSchema = requirementFieldsSchema.partial();

export type CreateRequirementInput =
  z.infer<typeof createRequirementSchema>;

export type UpdateRequirementInput =
  z.infer<typeof updateRequirementSchema>;
