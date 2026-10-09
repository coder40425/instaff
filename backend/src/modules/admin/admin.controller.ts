import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";

import {
  getPendingPartners, getAllPartners, approvePartner, rejectPartner, suspendPartner, reactivatePartner,
  getPendingWorkers, approveWorker, rejectWorker, suspendWorker, reactivateWorker,
  getAllBookings, getAnalytics, reassignBooking, forceCompleteBooking, forceCancelBooking,
  getReplacementCandidates,
  getPlatformPaymentInfo, upsertPlatformPaymentInfo,
  getAllWorkerWallets, settleWorkerWallet, getWorkerWalletById,
} from "./admin.service";

export const pendingPartners = async (_req: AuthRequest, res: Response) => {
  try {
    const partners = await getPendingPartners();
    return res.json({ success: true, count: partners.length, data: partners });
  } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
};

export const allPartners = async (_req: AuthRequest, res: Response) => {
  try {
    const partners = await getAllPartners();
    return res.json({ success: true, count: partners.length, data: partners });
  } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
};

export const approvePartnerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await approvePartner(String(req.params.partnerProfileId));
    return res.json({ success: true, data: partner });
  } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
};

export const rejectPartnerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await rejectPartner(String(req.params.partnerProfileId));
    return res.json({ success: true, data: partner });
  } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
};

export const suspendPartnerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await suspendPartner(String(req.params.partnerProfileId));
    return res.json({ success: true, data: partner });
  } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
};

export const reactivatePartnerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await reactivatePartner(String(req.params.partnerProfileId));
    return res.json({ success: true, data: partner });
  } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
};

export const pendingWorkers = async (req: AuthRequest, res: Response) => {
  try {
    const workers = await getPendingWorkers();
    res.json({ success: true, count: workers.length, data: workers });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const approveWorkerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const worker = await approveWorker(String(req.params.userId), req.user!.userId);
    res.json({ success: true, data: worker });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const rejectWorkerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const worker = await rejectWorker(String(req.params.userId), req.body.reason);
    res.json({ success: true, data: worker });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const suspendWorkerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const worker = await suspendWorker(String(req.params.userId), req.body.reason);
    res.json({ success: true, data: worker });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const reactivateWorkerHandler = async (req: AuthRequest, res: Response) => {
  try {
    const worker = await reactivateWorker(String(req.params.userId));
    res.json({ success: true, data: worker });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const bookings = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllBookings();
    res.json({ success: true, count: result.length, data: result });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const analytics = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAnalytics();
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const forceCompleteBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await forceCompleteBooking(String(req.params.id));
    res.json({ success: true, data: booking });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const forceCancelBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await forceCancelBooking(String(req.params.id));
    res.json({ success: true, data: booking });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const reassignBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await reassignBooking(String(req.params.id), req.body.newWorkerId);
    res.json({ success: true, data: booking });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const replacementCandidates = async (req: AuthRequest, res: Response) => {
  try {
    const workers = await getReplacementCandidates(String(req.params.id));
    res.json({ success: true, count: workers.length, data: workers });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

// ── Payment Info ──────────────────────────────────────────────────────────────

export const getPaymentInfo = async (req: AuthRequest, res: Response) => {
  try {
    const info = await getPlatformPaymentInfo();
    res.json({ success: true, data: info });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const updatePaymentInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { upiId, upiName, qrImageUrl } = req.body;
    if (!upiId || !upiName) {
      return res.status(400).json({ success: false, message: "upiId and upiName are required" });
    }
    const info = await upsertPlatformPaymentInfo(req.user!.userId, { upiId, upiName, qrImageUrl });
    res.json({ success: true, data: info });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

// ── Wallets ───────────────────────────────────────────────────────────────────

export const workerWallets = async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await getAllWorkerWallets();
    res.json({ success: true, data: wallets });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const settleWallet = async (req: AuthRequest, res: Response) => {
  try {
    const result = await settleWorkerWallet(String(req.params.workerProfileId), req.user!.userId, req.body.note);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

export const workerWalletDetail = async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await getWorkerWalletById(String(req.params.workerProfileId));
    res.json({ success: true, data: wallet });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};
