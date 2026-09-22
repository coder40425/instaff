export type Role = 'CUSTOMER' | 'WORKER' | 'ADMIN' | 'EMPLOYER';

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type BookingType = 'INSTANT' | 'SCHEDULED';

export type PaymentStatus = 'PENDING' | 'PAID';

export type ComplaintStatus = 'OPEN' | 'RESOLVED' | 'REJECTED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

export type EducationLevel =
  | 'NO_FORMAL_EDUCATION'
  | 'PRIMARY'
  | 'SECONDARY'
  | 'HIGHER_SECONDARY'
  | 'DIPLOMA'
  | 'GRADUATE'
  | 'POST_GRADUATE';

  export type WorkerDirectorySort = "sequence" | "name";
  export type EmploymentType =
  | 'PERMANENT'
  | 'CONTRACT'
  | 'FREELANCE'
  | 'PROJECT_BASED'
  | 'PART_TIME'
  | 'FULL_TIME'
  | 'TEMPORARY'
  | 'ON_CALL'
  | 'INTERNSHIP';

export type WorkMode = 'ON_SITE' | 'REMOTE';

export type WorkGeography = 'DOMESTIC' | 'INTERNATIONAL';

// ── Skill taxonomy types ──────────────────────────────────────────────────────

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sequence?: number;
  subCategories: SubCategory[];
}

export interface WorkerSkill {
  id: string;
  workerProfileId: string;
  subCategoryId: string;
  subCategory: SubCategory;
}

// ── Core entities ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerLocation {
  id: string;
  workerProfileId: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkerLocationPayload {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'name' | 'phone' | 'role'>;

  // Skills (replaces single skillCategory)
  skills: WorkerSkill[];

  // Documents
  aadhaarNumber: string;
  profilePhotoUrl?: string;

  // Personal
  gender?: Gender;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  languagesKnown?: string[];
  education?: EducationLevel;
  maritalStatus?: MaritalStatus;

  // Professional
  experience: number;
  expectedSalary: number;
  aboutYourself?: string;
  previousCompanies?: string;
  certifications?: string;
  availableTimings?: string;
  preferredWorkingRadius?: number;
  canRelocate?: boolean;
  employmentTypes: EmploymentType[];
workMode?: WorkMode;
workGeography?: WorkGeography;
preferredCountries?: string[];

  // Family & Emergency
  fatherName?: string;
  motherName?: string;
  emergencyContact?: string;
  emergencyContactNumber?: string;

  // Location
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;

  // Platform
  isVerified: boolean;
  isAvailable: boolean;
  isSuspended: boolean;
  rating: number;
  totalReviews: number;
  suspensionReason?: string;
  rejectionReason?: string;
  verifiedAt?: string;
}

export interface PublicWorkerLocation {
  id: string;
  workerProfileId: string;
  city: string;
  state?: string | null;
  isPrimary: boolean;
}

export interface PublicWorkerSkill {
  id: string;
  workerProfileId: string;
  subCategoryId: string;

  subCategory: {
    id: string;
    name: string;
    slug: string;
    categoryId: string;
    category?: {
      id: string;
      name: string;
      slug: string;
      sequence?: number;
    };
  };
}

export interface PublicWorkerProfile {
  id: string;
  userId: string;

  user?: {
    id: string;
    name: string;
  };

  profilePhotoUrl?: string;

  // Professional / customer-visible
  gender?: Gender;
  languagesKnown?: string[];
  education?: EducationLevel;

  experience: number;
  aboutYourself?: string;
  previousCompanies?: string;
  certifications?: string;
  availableTimings?: string;
  preferredWorkingRadius?: number;
  canRelocate?: boolean;

  employmentTypes: EmploymentType[];
  workMode?: WorkMode;
  workGeography?: WorkGeography;
  preferredCountries?: string[];

  // Service area — NOT residential address
  city?: string;
  state?: string;

  // Availability / platform
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
  totalReviews: number;

  skills: PublicWorkerSkill[];
  locations?: PublicWorkerLocation[];
}

export type Worker = PublicWorkerProfile;

export interface Booking {
  id: string;
  customerId: string;
  workerId: string;
  bookingType: BookingType;
  subCategoryId: string;
  subCategory?: SubCategory;
  address: string;
  city: string;
  scheduledDate?: string;
  durationMinutes: number;
  servicePrice: number;
  notes?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  customer?: User;
  worker?: WorkerProfile;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  workerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer?: User;
  booking?: Booking;
}

export interface Complaint {
  id: string;
  bookingId: string;
  customerId: string;
  againstUserId: string;
  reason: string;
  description: string;
  status: ComplaintStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
  customer?: User;
  againstUser?: User;
}

export interface AdminAnalytics {
  totalCustomers: number;
  totalWorkers: number;
  verifiedWorkers: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
}

export interface WorkerEarnings {
  totalBookings: number;
  totalEarnings: number;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  password: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WorkerDirectoryFilters {
  categoryId?: string;
  subCategoryId?: string;
  subCategoryIds?: string;
  search?: string;
  city?: string;
  isAvailable?: boolean;
  sort?: WorkerDirectorySort;
}

export type AssignmentMode =
  | 'PREFERRED_SINGLE'
  | 'SINGLE_WITH_BACKUP'
  | 'BULK_WORKFORCE';

export type RequirementStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'MATCHING'
  | 'FILLED'
  | 'COMPLETED'
  | 'CANCELLED';

export type RequirementCandidateStatus =
  | 'RECOMMENDED'
  | 'SHORTLISTED'
  | 'PRIMARY'
  | 'BACKUP'
  | 'ASSIGNED'
  | 'REJECTED'
  | 'EXPIRED';

export interface CreateRequirementPayload {
  categoryId: string;
  subCategoryId: string;
  city: string;
  state?: string;
  address?: string;
  shiftTiming?: string;
  salaryBudget?: number;
  minExperience?: number;
  joiningDate: string;
  requiredWorkerCount?: number;
  employmentTypes?: EmploymentType[];
  workMode?: WorkMode;
  workGeography?: WorkGeography;
  preferredCountries?: string[];
  assignmentMode?: AssignmentMode;
  backupPoolSize?: number;
  preferredWorkerProfileId?: string;
}

export type UpdateRequirementPayload =
  Partial<CreateRequirementPayload>;

export interface RequirementCandidate {
  id: string;
  requirementId: string;
  workerProfileId: string;

  status: RequirementCandidateStatus;

  matchScore?: number | null;
  matchReason?: string | null;
  rank?: number | null;

  notifiedAt?: string | null;
  interestedAt?: string | null;
  shortlistedAt?: string | null;
  assignedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  workerProfile?: PublicWorkerProfile;
}

export interface Requirement {
  id: string;
  createdById: string;

  categoryId: string;
  subCategoryId: string;

  city: string;
  state?: string | null;
  address?: string | null;

  shiftTiming?: string | null;
  salaryBudget?: number | null;
  minExperience: number;

  joiningDate: string;
  requiredWorkerCount: number;

  employmentTypes: EmploymentType[];
  workMode?: WorkMode | null;
  workGeography?: WorkGeography | null;
  preferredCountries: string[];

  assignmentMode: AssignmentMode;
  backupPoolSize: number;
  preferredWorkerProfileId?: string | null;

  status: RequirementStatus;

  createdAt: string;
  updatedAt: string;
  openedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;

  category?: Category;
  subCategory?: SubCategory;
  candidates?: RequirementCandidate[];
}

// ── CRM / Admin Operations ───────────────────────────────────────────────────

export interface CrmRequirementListItem {
  id: string;

  city: string;
  state?: string | null;

  joiningDate: string;
  requiredWorkerCount: number;

  assignmentMode: AssignmentMode;
  backupPoolSize: number;

  status: RequirementStatus;

  createdAt: string;
  updatedAt: string;

  category?: {
    id: string;
    name: string;
    slug: string;
    sequence?: number;
  };

  subCategory?: {
    id: string;
    name: string;
    slug: string;
    categoryId: string;
  };

  _count?: {
    candidates: number;
  };
}

export interface CrmPipelineCounts {
  recommended: number;
  shortlisted: number;
  primary: number;
  backup: number;
  assigned: number;
  rejected: number;
  expired: number;
}

export interface CrmFulfillment {
  required: number;
  assigned: number;
  remaining: number;
}

export interface CrmRequirementPipeline {
  requirementId: string;
  status: RequirementStatus;

  assignmentMode: AssignmentMode;

  requiredWorkerCount: number;
  backupPoolSize: number;

  pipeline: CrmPipelineCounts;

  fulfillment: CrmFulfillment;
}

export interface CrmRequirementsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CrmRequirementsResponse {
  data: CrmRequirementListItem[];
  pagination: CrmRequirementsPagination;
}

export interface CrmOverviewRequirements {
  open: number;
  matching: number;
  filled: number;
  active: number;

  workersRequired: number;
  workersAssigned: number;
  workersRemaining: number;
}

export interface CrmOverviewMatching {
  recommended: number;
  shortlisted: number;
  primary: number;
  backup: number;
  assigned: number;
}

export interface CrmOverviewAttention {
  pendingWorkers: number;
  requirementsNeedingMatching: number;
  requirementsNeedingAssignment: number;
  openComplaints: number;
  pendingBookings: number;
}

export interface CrmRecentRequirement {
  id: string;

  city: string;
  state?: string | null;

  joiningDate: string;
  requiredWorkerCount: number;

  assignmentMode: AssignmentMode;
  status: RequirementStatus;

  createdAt: string;
  updatedAt: string;

  category?: {
    id: string;
    name: string;
    slug: string;
  };

  subCategory?: {
    id: string;
    name: string;
    slug: string;
  };

  _count?: {
    candidates: number;
  };
}

export interface CrmRecentAssignment {
  id: string;
  requirementId: string;
  workerProfileId: string;

  assignedAt?: string | null;

  requirement: {
    id: string;

    city: string;
    state?: string | null;

    requiredWorkerCount: number;
    status: RequirementStatus;

    category?: {
      id: string;
      name: string;
    };

    subCategory?: {
      id: string;
      name: string;
    };
  };

  workerProfile?: PublicWorkerProfile;
}

export interface CrmOverview {
  requirements: CrmOverviewRequirements;

  matching: CrmOverviewMatching;

  attention: CrmOverviewAttention;

  recentRequirements: CrmRecentRequirement[];

  recentAssignments: CrmRecentAssignment[];
}

export interface CrmRequirementFilters {
  status?: RequirementStatus;
  search?: string;
  city?: string;
  categoryId?: string;
  subCategoryId?: string;
  page?: number;
  limit?: number;
}

// ── API response envelope types ────────────────────────────────────────────────

export interface ApiListResponse<T> {
  success: true;
  count: number;
  data: T[];
}

export interface ApiItemResponse<T> {
  success: true;
  data: T;
}