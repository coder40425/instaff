import { api } from './api';
import type { PublicWorkerProfile } from '../types';
import type { PartnerAssociatedWorker, PartnerDashboardSummary, PartnerProfile } from '../types/partner';

export const partnerService = {
  getProfile: async (): Promise<PartnerProfile> => {
    const response = await api.get('/partner/profile');
    return response.data.data;
  },

  getDashboardSummary: async (): Promise<PartnerDashboardSummary> => {
    const response = await api.get('/partner/dashboard-summary');
    return response.data.data;
  },

  updateProfile: async (data: { name: string }): Promise<{ name: string }> => {
    const response = await api.put('/partner/profile', data);
    return response.data.data;
  },

  getWorkers: async (): Promise<PartnerAssociatedWorker[]> => {
    const response = await api.get('/partner/workers');
    return response.data.data ?? [];
  },

  associateWorker: async (workerProfileId: string): Promise<PublicWorkerProfile> => {
    const response = await api.post('/partner/workers', { workerProfileId });
    return response.data.data;
  },

  removeWorker: async (workerProfileId: string): Promise<{ workerProfileId: string; partnerId: null }> => {
    const response = await api.delete(`/partner/workers/${workerProfileId}`);
    return response.data.data;
  },
};
