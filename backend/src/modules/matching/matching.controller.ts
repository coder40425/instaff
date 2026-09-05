import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";

import { generateRequirementMatches } from "./matching.service";

import {
  buildAssignmentPool,
  assignRequirementWorker,
} from "./assignment.service";

// ── Generate Matches ──────────────────────────────────────────────────────────

export const generateMatchesHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result =
      await generateRequirementMatches(
        String(req.params.id),
        req.user!.userId
      );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ── Build Assignment Pool ────────────────────────────────────────────────────

export const buildAssignmentPoolHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result =
      await buildAssignmentPool(
        String(req.params.id),
        req.user!.userId
      );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ── Assign Worker ─────────────────────────────────────────────────────────────

export const assignRequirementWorkerHandler =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const workerProfileId =
        String(req.body.workerProfileId || "");

      if (!workerProfileId) {
        return res.status(400).json({
          success: false,
          message:
            "workerProfileId is required",
        });
      }

      const result =
        await assignRequirementWorker(
          String(req.params.id),
          workerProfileId,
          req.user!.userId
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };