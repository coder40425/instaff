-- Create the discriminator shared by requirement and instant booking records.
CREATE TYPE "BusinessModel" AS ENUM (
  'REGULAR_EMPLOYMENT',
  'GIG_WORK',
  'BULK_MANPOWER'
);

-- Requirements represent staff hiring by default. Bookings remain service bookings.
ALTER TABLE "Requirement"
  ADD COLUMN "businessModel" "BusinessModel" NOT NULL DEFAULT 'REGULAR_EMPLOYMENT';

ALTER TABLE "Booking"
  ADD COLUMN "businessModel" "BusinessModel" NOT NULL DEFAULT 'GIG_WORK';

-- Preserve existing workforce requests before the default classifies the remaining
-- legacy requirements as regular employment.
UPDATE "Requirement"
SET "businessModel" = 'BULK_MANPOWER'
WHERE "assignmentMode" = 'BULK_WORKFORCE'
   OR "requiredWorkerCount" > 1;
