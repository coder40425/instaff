import { z } from "zod";

export const partnerProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();
