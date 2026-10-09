import { z } from "zod";
import { PARTNER_TYPES } from "../partner/partner.constants";

const partnerTypeSchema = z.enum(PARTNER_TYPES);

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "WORKER", "EMPLOYER", "PARTNER"]),
  partnerType: partnerTypeSchema.optional(),
});

export const partnerRegistrationSchema = registerSchema.extend({
  role: z.literal("PARTNER"),
  partnerType: partnerTypeSchema,
});

export const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});
