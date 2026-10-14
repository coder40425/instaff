import type { PublicWorkerProfile } from './index';

export const PARTNER_TYPES = [
  'FREELANCER',
  'AGENT',
  'AGENCY',
  'CONSULTANCY',
  'MANPOWER_SUPPLIER',
  'INTERNATIONAL_RECRUITER',
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

export type PartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface PartnerProfile {
  id: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  workerLimit: number | null;
  workerCount: number;
  createdAt: string;
}

export type PartnerWorkerOperationalStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'ON_DUTY'
  | 'OFFLINE'
  | 'SUSPENDED';

export interface PartnerAssociatedWorker extends PublicWorkerProfile {
  operationalStatus: PartnerWorkerOperationalStatus | null;
}

export interface PartnerDashboardSummary {
  workforce: {
    total: number;
    available: number;
    busy: number;
    onDuty: number;
    verificationPending: number;
  };
  assignments: {
    openRequirements: number;
    pendingOffers: number;
    confirmedAssignments: number;
    upcomingAssignments: number;
    openReplacementRequests: number;
  };
}

export interface AdminPartnerProfile {
  id: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  workerLimit: number | null;
  createdAt: string;
  user: { id: string; name: string };
}
