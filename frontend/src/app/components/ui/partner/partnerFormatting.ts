import type { PartnerType } from '../../../types/partner';

export const formatPartnerType = (partnerType: PartnerType) =>
  partnerType
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
