export const PARTNER_TYPES = [
  "FREELANCER",
  "AGENT",
  "AGENCY",
  "CONSULTANCY",
  "MANPOWER_SUPPLIER",
  "INTERNATIONAL_RECRUITER",
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

export const workerLimitForPartnerType = (
  partnerType: PartnerType
): number | null => {
  switch (partnerType) {
    case "FREELANCER":
      return 100;
    case "AGENT":
      return 500;
    default:
      return null;
  }
};

export const effectivePartnerWorkerLimit = (
  partnerType: PartnerType,
  storedLimit: number | null
): number | null => {
  const typeLimit = workerLimitForPartnerType(partnerType);
  if (typeLimit === null) return null;
  if (storedLimit === null) return typeLimit;
  return Math.max(0, Math.min(storedLimit, typeLimit));
};
