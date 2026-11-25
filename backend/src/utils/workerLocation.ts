import { Prisma } from "@prisma/client";

type WorkerLocationValue = {
  city: string | null;
  state: string | null;
};

type WorkerWithLocations = WorkerLocationValue & {
  locations?: WorkerLocationValue[];
};

const normalized = (value: string | null | undefined) =>
  value?.trim().toLocaleLowerCase() ?? "";

const locationMatches = (
  location: WorkerLocationValue,
  city: string,
  state?: string | null
) =>
  normalized(location.city) === normalized(city) &&
  (!normalized(state) || normalized(location.state) === normalized(state));

/**
 * Saved locations are authoritative when present. Legacy profile fields are
 * retained as a fallback for profiles that predate WorkerLocation rows.
 */
export const workerMatchesRequirementLocation = (
  worker: WorkerWithLocations,
  requirement: { city: string; state?: string | null }
) => {
  const savedLocations = worker.locations ?? [];
  const locations = savedLocations.length > 0
    ? savedLocations
    : [{ city: worker.city, state: worker.state }];

  return locations.some((location) =>
    locationMatches(location, requirement.city, requirement.state)
  );
};

/** Build a Prisma filter with the same saved-location/legacy-fallback rule. */
export const workerLocationWhere = (
  city: string,
  state?: string | null
): Prisma.WorkerProfileWhereInput => {
  const locationWhere: Prisma.WorkerLocationWhereInput = {
    city: { equals: city.trim(), mode: "insensitive" },
    ...(normalized(state)
      ? { state: { equals: state!.trim(), mode: "insensitive" as const } }
      : {}),
  };

  return {
    OR: [
      { locations: { some: locationWhere } },
      {
        AND: [
          { locations: { none: {} } },
          {
            city: { equals: city.trim(), mode: "insensitive" },
            ...(normalized(state)
              ? { state: { equals: state!.trim(), mode: "insensitive" as const } }
              : {}),
          },
        ],
      },
    ],
  };
};
