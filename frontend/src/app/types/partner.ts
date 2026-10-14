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
export type PartnerDocumentType =
  | 'AADHAAR'
  | 'PAN'
  | 'GST_CERTIFICATE'
  | 'PASSPORT'
  | 'POLICE_VERIFICATION'
  | 'BUSINESS_REGISTRATION'
  | 'CERTIFICATE'
  | 'RESUME'
  | 'AGREEMENT'
  | 'EXPERIENCE_LETTER'
  | 'OTHER';
export type PartnerDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type PartnerVerificationSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PartnerProfileEditableFields {
  businessName: string | null;
  contactPerson: string | null;
  email: string | null;
  alternatePhone: string | null;
  profilePhotoUrl: string | null;
  businessRegistrationNumber: string | null;
  panNumber: string | null;
  gstin: string | null;
  website: string | null;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export type PartnerProfileUpdate = {
  name: string;
} & Partial<Record<keyof PartnerProfileEditableFields, string | null>>;

export interface PartnerDocument {
  id: string;
  documentType: PartnerDocumentType;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  verificationStatus: PartnerDocumentStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  submissionId: string | null;
}

export interface PartnerVerificationSubmission {
  id: string;
  proposedChanges: Partial<Pick<PartnerProfileUpdate, 'name' | 'businessRegistrationNumber' | 'panNumber' | 'gstin'>>;
  status: PartnerVerificationSubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface PartnerProfile extends PartnerProfileEditableFields {
  id: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  workerLimit: number | null;
  workerCount: number;
  createdAt: string;
  name: string;
  phone: string;
  documents: PartnerDocument[];
  verificationSubmissions: PartnerVerificationSubmission[];
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
  businessOverview: {
    todayRevenue: number | null;
    monthlyRevenue: number | null;
    commission: number | null;
    walletBalance: number | null;
    pendingPayments: number | null;
    averageAssociatedWorkerRating: number | null;
    associatedWorkerReviewCount: number;
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

export interface AdminPartnerDocument extends PartnerDocument {
  reviewedBy: string | null;
}

export interface AdminPartnerVerificationSubmission {
  id: string;
  proposedChanges: PartnerVerificationSubmission['proposedChanges'];
  status: PartnerVerificationSubmissionStatus;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documents: Omit<AdminPartnerDocument, 'submissionId'>[];
}

export interface AdminPartnerVerificationDetails extends PartnerProfileEditableFields {
  id: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  createdAt: string;
  user: { id: string; name: string; phone: string };
  documents: AdminPartnerDocument[];
  verificationSubmissions: AdminPartnerVerificationSubmission[];
}
