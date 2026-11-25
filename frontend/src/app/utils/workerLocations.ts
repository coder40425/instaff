type LocationLabelInput = {
  city?: string | null;
  state?: string | null;
  isPrimary?: boolean;
};

type WorkerLocationLabelSource = {
  city?: string | null;
  state?: string | null;
  locations?: LocationLabelInput[] | null;
};

/** Prefer saved work locations, falling back to legacy profile fields. */
export const workerLocationLabels = (worker: WorkerLocationLabelSource) => {
  const savedLocations = [...(worker.locations ?? [])]
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)))
    .map((location) => [location.city?.trim(), location.state?.trim()]
      .filter(Boolean)
      .join(", "))
    .filter(Boolean);
  const uniqueSavedLocations = [...new Map(
    savedLocations.map((label) => [label.toLocaleLowerCase(), label])
  ).values()];

  if (uniqueSavedLocations.length > 0) return uniqueSavedLocations;

  const legacyLocation = [worker.city?.trim(), worker.state?.trim()]
    .filter(Boolean)
    .join(", ");
  return legacyLocation ? [legacyLocation] : [];
};

export const formatWorkerLocations = (worker: WorkerLocationLabelSource) =>
  workerLocationLabels(worker).join(" · ");
