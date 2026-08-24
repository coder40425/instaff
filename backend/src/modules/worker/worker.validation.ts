import { z } from "zod";

// ── Shared enums ──────────────────────────────────────────────────────────────

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const maritalStatusEnum = z.enum([
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
]);

const educationLevelEnum = z.enum([
  "NO_FORMAL_EDUCATION",
  "PRIMARY",
  "SECONDARY",
  "HIGHER_SECONDARY",
  "DIPLOMA",
  "GRADUATE",
  "POST_GRADUATE",
]);

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

// ── Base worker profile fields ───────────────────────────────────────────────

const workerProfileFields = {
  // Documents
  aadhaarNumber: z.string().length(12, "Aadhaar must be exactly 12 digits"),
  profilePhotoUrl: z.string().url().optional(),

  // Personal
  gender: genderEnum.optional(),
  dateOfBirth: z.string().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  languagesKnown: z.array(z.string()).optional(),
  education: educationLevelEnum.optional(),
  maritalStatus: maritalStatusEnum.optional(),

  // Professional
  skillIds: z
    .array(z.string())
    .min(1, "At least one skill is required"),

  experience: z.number().min(0),

  expectedSalary: z.number().positive(),

  employmentTypes: z
    .array(employmentTypeEnum)
    .min(1, "At least one employment type is required"),

  workMode: workModeEnum.optional(),

  workGeography: workGeographyEnum.optional(),

  preferredCountries: z
    .array(z.string().min(2))
    .optional(),

  aboutYourself: z.string().max(1000).optional(),

  previousCompanies: z.string().optional(),

  certifications: z.string().optional(),

  availableTimings: z.string().optional(),

  preferredWorkingRadius: z
    .number()
    .int()
    .positive()
    .optional(),

  canRelocate: z.boolean().optional(),

  // Family & Emergency
  fatherName: z.string().optional(),

  motherName: z.string().optional(),

  emergencyContact: z.string().optional(),

  emergencyContactNumber: z.string().optional(),

  // Location
  city: z.string().min(2).optional(),

  state: z.string().min(2).optional(),

  latitude: z.number().optional(),

  longitude: z.number().optional(),
};

// ── Full create schema ───────────────────────────────────────────────────────

export const workerProfileSchema = z
  .object(workerProfileFields)
  .superRefine((data, ctx) => {
    if (
      data.workGeography === "INTERNATIONAL" &&
      (!data.preferredCountries ||
        data.preferredCountries.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredCountries"],
        message:
          "Select at least one country for international work",
      });
    }

    if (
      data.workGeography === "DOMESTIC" &&
      data.preferredCountries &&
      data.preferredCountries.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredCountries"],
        message:
          "Countries should only be selected for international work",
      });
    }
  });

// ── Partial update schema ────────────────────────────────────────────────────
// IMPORTANT:
// Do NOT call .partial() on workerProfileSchema because it contains
// .superRefine(). Build the partial object from the original fields instead.

export const updateWorkerProfileSchema = z
  .object(workerProfileFields)
  .partial()
  .extend({
    skillIds: z
      .array(z.string())
      .min(1)
      .optional(),

    employmentTypes: z
      .array(employmentTypeEnum)
      .min(1)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.workGeography === "INTERNATIONAL" &&
      (!data.preferredCountries ||
        data.preferredCountries.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredCountries"],
        message:
          "Select at least one country for international work",
      });
    }

    if (
      data.workGeography === "DOMESTIC" &&
      data.preferredCountries &&
      data.preferredCountries.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredCountries"],
        message:
          "Countries should only be selected for international work",
      });
    }
  });

// ── Availability ──────────────────────────────────────────────────────────────

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

// ── Location ──────────────────────────────────────────────────────────────────

export const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().optional(),
  state: z.string().optional(),
});