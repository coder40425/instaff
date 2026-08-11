import axios from 'axios';
import type { AuthResponse, LoginRequest, RegisterRequest, WorkerDirectoryFilters } from '../types';

const API_BASE =
  ((import.meta as any).env?.VITE_API_URL as string) ||
  'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data.data;
  },
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data.data;
  },
};

export const categoryService = {
  getAll: async (sort: 'sequence' | 'name' = 'sequence') => {
    const response = await api.get('/categories', {
      params: { sort },
    });

    return response.data.data;
  },
};

export const workerService = {
  getAll: async (params?: WorkerDirectoryFilters) => {
  const response = await api.get('/workers', {
    params,
  });

  return response.data.data;
},
  getById: async (id: string) => {
    const response = await api.get(`/workers/${id}`);
    return response.data.data;
  },
  updateAvailability: async (isAvailable: boolean) => {
    const response = await api.patch('/worker/availability', { isAvailable });
    return response.data;
  },
  updateLocation: async (data: { latitude: number; longitude: number; city: string; state: string }) => {
    const response = await api.patch('/worker/location', data);
    return response.data;
  },
  getEarnings: async () => {
    const response = await api.get('/worker/earnings');
    return response.data.data;
  },
};

export const bookingService = {
  create: async (data: {
    workerId: string;
    bookingType: string;
    subCategoryId: string;
    address: string;
    city: string;
    scheduledDate: string;
    durationMinutes: number;
    servicePrice: number;
    notes?: string;
  }) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },
  getMyBookings:    async () => { const r = await api.get('/bookings/my');          return r.data.data; },
  getWorkerBookings: async () => { const r = await api.get('/bookings/worker/my');  return r.data.data; },
  acceptBooking:    async (id: string) => { const r = await api.patch(`/bookings/${id}/accept`);            return r.data; },
  rejectBooking:    async (id: string) => { const r = await api.patch(`/bookings/${id}/reject`);            return r.data; },
  startService:     async (id: string) => { const r = await api.patch(`/bookings/${id}/customer-start`);    return r.data; },
  completeService:  async (id: string) => { const r = await api.patch(`/bookings/${id}/customer-complete`); return r.data; },
  cancelBooking:    async (id: string) => { const r = await api.patch(`/bookings/${id}/cancel`);            return r.data; },
  markNoShow:       async (id: string) => { const r = await api.patch(`/bookings/${id}/no-show`);           return r.data; },
  markPaid: async (id: string, paymentMethod: string) => {
    const r = await api.patch(`/bookings/${id}/pay`, { paymentMethod });
    return r.data;
  },
  requestReplacement: async (id: string, reason: string) => {
    const r = await api.patch(`/bookings/${id}/replacement`, { reason });
    return r.data;
  },
  // Worker confirms customer paid via UPI → credits wallet
  confirmPayment: async (id: string) => {
    const r = await api.patch(`/bookings/${id}/confirm-payment`);
    return r.data;
  },
};

export const reviewService = {
  create: async (data: { bookingId: string; rating: number; comment?: string }) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },
  getWorkerReviews: async (workerId: string) => {
    const response = await api.get(`/reviews/worker/${workerId}`);
    return response.data.data;
  },
};

export const complaintService = {
  create: async (data: { bookingId: string; againstUserId: string; reason: string; description?: string }) => {
    const response = await api.post('/complaints', data);
    return response.data;
  },
  getMy:  async () => { const r = await api.get('/complaints/my');    return r.data.data; },
  getAll: async () => { const r = await api.get('/complaints/admin'); return r.data.data; },
  resolve: async (id: string, adminNotes?: string) => {
    const r = await api.patch(`/complaints/admin/${id}/resolve`, { adminNotes });
    return r.data;
  },
  reject: async (id: string, adminNotes?: string) => {
    const r = await api.patch(`/complaints/admin/${id}/reject`, { adminNotes });
    return r.data;
  },
};

export const adminService = {
  getAnalytics:      async () => { const r = await api.get('/admin/analytics');       return r.data.data; },
  getPendingWorkers: async () => { const r = await api.get('/admin/workers/pending'); return r.data.data; },
  approveWorker:     async (userId: string) => { const r = await api.patch(`/admin/workers/${userId}/approve`);     return r.data; },
  rejectWorker:      async (userId: string, reason: string) => { const r = await api.patch(`/admin/workers/${userId}/reject`,  { reason }); return r.data; },
  suspendWorker:     async (userId: string, reason: string) => { const r = await api.patch(`/admin/workers/${userId}/suspend`, { reason }); return r.data; },
  reactivateWorker:  async (userId: string) => { const r = await api.patch(`/admin/workers/${userId}/reactivate`); return r.data; },
  getAllBookings:     async () => { const r = await api.get('/admin/bookings');        return r.data.data; },
  forceCompleteBooking: async (id: string) => { const r = await api.patch(`/admin/bookings/${id}/complete`); return r.data; },
  forceCancelBooking:   async (id: string) => { const r = await api.patch(`/admin/bookings/${id}/cancel`);   return r.data; },
  getReplacementCandidates: async (bookingId: string) => {
    const r = await api.get(`/admin/bookings/${bookingId}/replacement-candidates`);
    return r.data.data;
  },
  assignReplacement: async (bookingId: string, workerId: string) => {
    const r = await api.patch(`/admin/bookings/${bookingId}/reassign`, { newWorkerId: workerId });
    return r.data;
  },
  // Payment info
  getPaymentInfo: async () => { const r = await api.get('/admin/payment-info');       return r.data.data; },
  updatePaymentInfo: async (data: { upiId: string; upiName: string; qrImageUrl?: string }) => {
    const r = await api.put('/admin/payment-info', data);
    return r.data.data;
  },
  // Wallets
  getAllWallets: async () => { const r = await api.get('/admin/wallets');              return r.data.data; },
  getWalletDetail: async (workerProfileId: string) => {
    const r = await api.get(`/admin/wallets/${workerProfileId}`);
    return r.data.data;
  },
  settleWallet: async (workerProfileId: string, note?: string) => {
    const r = await api.patch(`/admin/wallets/${workerProfileId}/settle`, { note });
    return r.data;
  },
};

export type UpdateWorkerProfilePayload = {
  aadhaarNumber?: string;
  profilePhotoUrl?: string;
  skillIds?: string[];
  gender?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  languagesKnown?: string[];
  education?: string;
  maritalStatus?: string;
  experience?: number;
  expectedSalary?: number;
  aboutYourself?: string;
  previousCompanies?: string;
  certifications?: string;
  availableTimings?: string;
  preferredWorkingRadius?: number;
  canRelocate?: boolean;
  fatherName?: string;
  motherName?: string;
  emergencyContact?: string;
  emergencyContactNumber?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
};

export const profileService = {
  updateCustomer: async (data: { gender?: string; address?: string; city?: string; state?: string; latitude?: number; longitude?: number }) => {
    const response = await api.put('/customer/profile', data);
    return response.data;
  },
  getCustomerProfile: async () => {
    const response = await api.get('/customer/profile');
    return response.data.data;
  },
  createCustomerProfile: async (data: any) => {
    const response = await api.post('/customer/profile', data);
    return response.data;
  },
  updateWorker: async (data: UpdateWorkerProfilePayload) => {
    const response = await api.put('/worker/profile', data);
    return response.data;
  },
  getWorkerProfile: async () => {
    const response = await api.get('/worker/profile');
    return response.data.data;
  },
  getPaymentInfo: async () => {
    const response = await api.get('/worker/payment-info');
    return response.data.data;
  },
};

export const walletService = {
  getMyWallet: async () => {
    const response = await api.get('/worker/wallet');
    return response.data.data;
  },
};