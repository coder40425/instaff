import { NextFunction, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "./authMiddleware";

export interface PartnerRequest extends AuthRequest {
  partnerProfileId?: string;
}

export const requireApprovedPartner = async (
  req: PartnerRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        role: true,
        partnerProfile: {
          select: { id: true, status: true },
        },
      },
    });

    if (!user || user.role !== "PARTNER" || !user.partnerProfile) {
      return res.status(403).json({
        success: false,
        message: "Partner profile not found",
      });
    }

    if (user.partnerProfile.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Partner account is not approved",
      });
    }

    req.partnerProfileId = user.partnerProfile.id;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to verify Partner account",
    });
  }
};
