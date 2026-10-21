export interface WorkerProfileCompletenessSource {
  aadhaarNumber?: string | null;
  skills?: unknown[] | null;
  experience?: number | null;
  expectedSalary?: number | null;
  employmentTypes?: unknown[] | null;
  workGeography?: string | null;
  preferredCountries?: string[] | null;
}

export const getMissingWorkerProfileFields = (
  profile?: WorkerProfileCompletenessSource | null
): string[] => {
  if (!profile) {
    return [
      'Aadhaar number',
      'at least one skill',
      'experience',
      'expected salary',
      'at least one employment type',
    ];
  }

  const missing: string[] = [];

  if ((profile.aadhaarNumber?.trim().length ?? 0) !== 12) missing.push('Aadhaar number');
  if (!profile.skills?.length) missing.push('at least one skill');
  if (profile.experience == null || !Number.isFinite(profile.experience)) {
    missing.push('experience');
  }
  if (
    profile.expectedSalary == null ||
    !Number.isFinite(profile.expectedSalary) ||
    profile.expectedSalary <= 0
  ) {
    missing.push('expected salary');
  }
  if (!profile.employmentTypes?.length) {
    missing.push('at least one employment type');
  }
  if (
    profile.workGeography === 'INTERNATIONAL' &&
    !profile.preferredCountries?.length
  ) {
    missing.push('at least one preferred country for international work');
  }

  return missing;
};

export const isWorkerProfileComplete = (
  profile?: WorkerProfileCompletenessSource | null
) => getMissingWorkerProfileFields(profile).length === 0;
