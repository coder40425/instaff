import { z } from "zod";

const serviceFormats = [
  "ONE_TIME",
  "HOURLY",
  "SESSION",
  "DAILY",
  "MULTIPLE_VISITS",
  "WEEKLY",
  "MONTHLY",
] as const;

const visitSchema = z.object({
  scheduledDate: z.string().min(1, "Visit date and time is required"),
  durationMinutes: z.number().int().positive("Duration must be a positive number of minutes"),
});

const recurringScheduleSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid start date"),
  visitTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid visit time"),
  timeZone: z.string().min(1, "Time zone is required"),
  durationMinutes: z.number().int().positive("Visit duration must be a positive number of minutes"),
  weekday: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  occurrenceCount: z.number().int().min(1).max(100).optional(),
});

export const createBookingSchema = z.object({
  requestId: z.string().min(16).max(100).optional(),
  workerId: z.string().min(1, "Worker is required"),
  bookingType: z.enum(["INSTANT", "SCHEDULED"]),
  serviceFormat: z.enum(serviceFormats).default("ONE_TIME"),
  subCategoryId: z.string().min(1, "Service category is required"),
  address: z.string().min(5),
  city: z.string().min(2),
  scheduledDate: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  servicePrice: z.number().positive(),
  notes: z.string().optional(),
  visits: z.array(visitSchema).max(100).optional(),
  schedule: recurringScheduleSchema.optional(),
}).superRefine((booking, ctx) => {
  const recurring = booking.serviceFormat === "WEEKLY" || booking.serviceFormat === "MONTHLY";
  if (booking.serviceFormat === "MULTIPLE_VISITS") {
    if (!booking.visits || booking.visits.length < 2) {
      ctx.addIssue({ code: "custom", path: ["visits"], message: "Add at least two visits" });
    }
    if (booking.schedule) {
      ctx.addIssue({ code: "custom", path: ["schedule"], message: "Multiple Visits uses individual visit dates" });
    }
  } else if (recurring) {
    if (!booking.schedule) {
      ctx.addIssue({ code: "custom", path: ["schedule"], message: "Enter the recurring schedule" });
    }
    if (booking.visits) {
      ctx.addIssue({ code: "custom", path: ["visits"], message: "Recurring visits are generated from the schedule" });
    }
    if (booking.serviceFormat === "WEEKLY" && booking.schedule && booking.schedule.weekday === undefined) {
      ctx.addIssue({ code: "custom", path: ["schedule", "weekday"], message: "Choose a weekday" });
    }
    if (booking.serviceFormat === "MONTHLY" && booking.schedule && booking.schedule.dayOfMonth === undefined) {
      ctx.addIssue({ code: "custom", path: ["schedule", "dayOfMonth"], message: "Choose a day of the month" });
    }
    if (booking.schedule) {
      const hasEndDate = Boolean(booking.schedule.endDate);
      const hasCount = booking.schedule.occurrenceCount !== undefined;
      if (hasEndDate === hasCount) {
        ctx.addIssue({ code: "custom", path: ["schedule"], message: "Choose either an end date or a number of visits" });
      }
    }
  } else {
    if (!booking.scheduledDate) {
      ctx.addIssue({ code: "custom", path: ["scheduledDate"], message: "Date and time are required" });
    }
    if (!booking.durationMinutes) {
      ctx.addIssue({ code: "custom", path: ["durationMinutes"], message: "Duration must be a positive number of minutes" });
    } else if (booking.serviceFormat === "ONE_TIME" && booking.durationMinutes < 60) {
      ctx.addIssue({ code: "custom", path: ["durationMinutes"], message: "One-Time bookings must be at least 60 minutes" });
    }
    if (booking.visits || booking.schedule) {
      ctx.addIssue({ code: "custom", path: ["schedule"], message: "This service format uses one scheduled occurrence" });
    }
  }
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
