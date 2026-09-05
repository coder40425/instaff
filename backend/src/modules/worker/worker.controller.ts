import { Response, Request } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";

import {
  createWorkerProfile,
  getWorkerEarnings,
  getWorkerProfile,
  getWorkerWallet,
  updateAvailability,
  updateLocation,
  updateWorkerProfile,
  getWorkerLocations,
addWorkerLocation,
deleteWorkerLocation,
setPrimaryWorkerLocation,
} from "./worker.service";

import {
  workerProfileSchema,
  updateWorkerProfileSchema,
  availabilitySchema,
  locationSchema,
  workerLocationsSchema,
} from "./worker.validation";

import { getPlatformPaymentInfo } from "../admin/admin.service";

import prisma from "../../config/prisma";

// ── Categories (public) ───────────────────────────────────────────────────────

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { subCategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const createProfile = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = workerProfileSchema.parse(req.body);
    const profile = await createWorkerProfile(req.user!.userId, validatedData);
    res.status(201).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getWorkerProfile(req.user!.userId);
    res.status(200).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = updateWorkerProfileSchema.parse(req.body);
    const profile = await updateWorkerProfile(req.user!.userId, validatedData);
    res.status(200).json({ success: true, data: profile });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const toggleAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const data = availabilitySchema.parse(req.body);
    const result = await updateAvailability(req.user!.userId, data.isAvailable);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateWorkerLocation = async (req: AuthRequest, res: Response) => {
  try {
    const data = locationSchema.parse(req.body);
    const result = await updateLocation(req.user!.userId, data);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const earnings = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getWorkerEarnings(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Wallet ────────────────────────────────────────────────────────────────────

export const getWallet = async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await getWorkerWallet(req.user!.userId);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Payment Info (worker-visible, admin-managed) ───────────────────────────────

export const getPlatformPaymentInfoHandler = async (req: AuthRequest, res: Response) => {
  try {
    const info = await getPlatformPaymentInfo();
    res.json({ success: true, data: info });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getWorkerLocationsHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const locations = await getWorkerLocations(
      req.user!.userId
    );

    res.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const addWorkerLocationHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const data = workerLocationsSchema
      .shape.locations
      .element
      .parse(req.body);

    const location = await addWorkerLocation(
      req.user!.userId,
      data
    );

    res.status(201).json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteWorkerLocationHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const location =
      await deleteWorkerLocation(
        req.user!.userId,
        String(req.params.locationId)
      );

    res.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const setPrimaryWorkerLocationHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const location =
      await setPrimaryWorkerLocation(
        req.user!.userId,
        String(req.params.locationId)
      );

    res.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};