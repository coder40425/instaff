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

export type Worker = WorkerProfile;

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
  isVerified?: boolean;
  sort?: WorkerDirectorySort;
}