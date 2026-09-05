import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";

import {
  createRequirement,
  getMyRequirements,
  getRequirementById,
  openRequirement,
  cancelRequirement,
  updateRequirement,
} from "./requirement.service";
import { updateRequirementSchema } from "./requirement.validation";

export const createRequirementHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const requirement = await createRequirement(
      req.user!.userId,
      req.body
    );

    res.status(201).json({
      success: true,
      data: requirement,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyRequirementsHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const requirements = await getMyRequirements(
      req.user!.userId
    );

    res.json({
      success: true,
      data: requirements,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRequirementHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const requirement = await getRequirementById(
      String(req.params.id),
      req.user!.userId
    );

    res.json({
      success: true,
      data: requirement,
    });
  } catch (error: any) {
    const status =
      error.message === "Unauthorized" ? 403 : 404;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const openRequirementHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const requirement = await openRequirement(
      String(req.params.id),
      req.user!.userId
    );

    res.json({
      success: true,
      data: requirement,
    });
  } catch (error: any) {
    const status =
      error.message === "Unauthorized" ? 403 : 400;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelRequirementHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const requirement = await cancelRequirement(
      String(req.params.id),
      req.user!.userId
    );

    res.json({
      success: true,
      data: requirement,
    });
  } catch (error: any) {
    const status =
      error.message === "Unauthorized" ? 403 : 400;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateRequirementHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const data = updateRequirementSchema.parse(
      req.body
    );

    const requirement =
      await updateRequirement(
        String(req.params.id),
        req.user!.userId,
        data
      );

    res.json({
      success: true,
      data: requirement,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};