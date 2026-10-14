import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim() === ""
          ? null
          : value.trim()
        : value,
    z.string().max(maxLength).nullable().optional()
  );

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value.trim() === ""
        ? null
        : value.trim()
      : value,
  z.string().email().max(254).nullable().optional()
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value.trim() === ""
        ? null
        : value.trim()
      : value,
  z
    .string()
    .url()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), "URL must use HTTP or HTTPS")
    .nullable()
    .optional()
);

const optionalPan = optionalText(10)
  .transform((value) => (typeof value === "string" ? value.toUpperCase() : value))
  .refine(
    (value) => value == null || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value),
    "PAN must be a valid 10-character PAN"
  );

const optionalGstin = optionalText(15)
  .transform((value) => (typeof value === "string" ? value.toUpperCase() : value))
  .refine(
    (value) => value == null || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value),
    "GSTIN must be a valid 15-character GSTIN"
  );

export const partnerProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: optionalEmail,
    contactPerson: optionalText(100),
    alternatePhone: optionalText(30).refine(
      (value) => value == null || /^[+0-9() .-]{6,30}$/.test(value),
      "Alternate phone number is invalid"
    ),
    profilePhotoUrl: optionalUrl,
    businessName: optionalText(150),
    businessRegistrationNumber: optionalText(100),
    panNumber: optionalPan,
    gstin: optionalGstin,
    website: optionalUrl,
    description: optionalText(2000),
    addressLine1: optionalText(200),
    addressLine2: optionalText(200),
    city: optionalText(100),
    district: optionalText(100),
    state: optionalText(100),
    postalCode: optionalText(20),
    country: optionalText(100),
  })
  .strict();

export type PartnerProfileUpdate = z.infer<typeof partnerProfileUpdateSchema>;

export const verificationRejectionSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();
