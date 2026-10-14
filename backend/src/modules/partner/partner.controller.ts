import { Response } from "express";
import { PartnerRequest } from "../../middleware/partnerMiddleware";
import {
  associateWorker,
  getPartnerDashboardSummary,
  getOwnPartnerProfile,
  listAssociatedWorkers,
  removeAssociatedWorker,
  updateOwnPartnerProfile,
} from "./partner.service";
import { partnerProfileUpdateSchema } from "./partner.validation";

export const ownProfile = async (req: PartnerRequest, res: Response) => {
  try {
    const profile = await getOwnPartnerProfile(req.user!.userId);
    return res.json({ success: true, data: profile });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateOwnProfile = async (req: PartnerRequest, res: Response) => {
  try {
    const { name } = partnerProfileUpdateSchema.parse(req.body);
    const profile = await updateOwnPartnerProfile(req.user!.userId, name);
    return res.json({ success: true, data: profile });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const associatedWorkers = async (req: PartnerRequest, res: Response) => {
  try {
    const workers = await listAssociatedWorkers(req.partnerProfileId!);
    return res.json({ success: true, count: workers.length, data: workers });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const dashboardSummary = async (req: PartnerRequest, res: Response) => {
  try {
    const summary = await getPartnerDashboardSummary(
      req.partnerProfileId!,
      req.user!.userId
    );
    return res.json({ success: true, data: summary });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const addAssociatedWorker = async (req: PartnerRequest, res: Response) => {
  try {
    const worker = await associateWorker(
      req.partnerProfileId!,
      String(req.body.workerProfileId || "")
    );
    return res.status(201).json({ success: true, data: worker });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteAssociatedWorker = async (req: PartnerRequest, res: Response) => {
  try {
    const result = await removeAssociatedWorker(
      req.partnerProfileId!,
      String(req.params.workerProfileId)
    );
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
