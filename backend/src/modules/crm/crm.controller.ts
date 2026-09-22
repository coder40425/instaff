import { Request, Response } from "express";

import {
  getCrmOverview,
  getRecentCrmRequirements,
  getRecentCrmAssignments,
  getCrmRequirements,
  getCrmRequirementById,
  getCrmRequirementPipeline,
  generateCrmMatches,
  buildCrmAssignmentPool,
  assignCrmRequirementWorker,
} from "./crm.service";
import { AuthRequest } from "../../middleware/authMiddleware";

/* =========================================================
   HELPER
========================================================= */

/* =========================================================
   CRM OVERVIEW
========================================================= */

export const getCrmOverviewHandler =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const [
        overview,
        recentRequirements,
        recentAssignments,
      ] = await Promise.all([
        getCrmOverview(),
        getRecentCrmRequirements(8),
        getRecentCrmAssignments(8),
      ]);

      return res.status(200).json({
        success: true,

        data: {
          ...overview,

          recentRequirements,

          recentAssignments,
        },
      });
    } catch (error: any) {
      console.error(
        "GET_CRM_OVERVIEW_ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Failed to load CRM overview",
      });
    }
  };

/* =========================================================
   REQUIREMENT LIST
========================================================= */

export const getCrmRequirementsHandler =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        status,
        search,
        city,
        categoryId,
        subCategoryId,
        page,
        limit,
      } = req.query;

      const result =
        await getCrmRequirements({
          status: status
            ? String(status) as any
            : undefined,

          search: search
            ? String(search)
            : undefined,

          city: city
            ? String(city)
            : undefined,

          categoryId:
            categoryId
              ? String(categoryId)
              : undefined,

          subCategoryId:
            subCategoryId
              ? String(subCategoryId)
              : undefined,

          page: page
            ? Number(page)
            : undefined,

          limit: limit
            ? Number(limit)
            : undefined,
        });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error(
        "GET_CRM_REQUIREMENTS_ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Failed to load CRM requirements",
      });
    }
  };

/* =========================================================
   REQUIREMENT DETAIL
========================================================= */

export const getCrmRequirementByIdHandler =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error:
            "Requirement ID is required",
        });
      }

      const requirement =
        await getCrmRequirementById(id);

      return res.status(200).json({
        success: true,
        data: requirement,
      });
    } catch (error: any) {
      console.error(
        "GET_CRM_REQUIREMENT_ERROR:",
        error
      );

      const message =
        error?.message ||
        "Failed to load requirement";

      const status =
        message ===
        "Requirement not found"
          ? 404
          : message ===
              "Requirement ID is required"
            ? 400
            : 500;

      return res.status(status).json({
        success: false,
        message: message,
      });
    }
  };

/* =========================================================
   REQUIREMENT PIPELINE
========================================================= */

export const getCrmRequirementPipelineHandler =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error:
            "Requirement ID is required",
        });
      }

      const pipeline =
        await getCrmRequirementPipeline(id);

      return res.status(200).json({
        success: true,
        data: pipeline,
      });
    } catch (error: any) {
      console.error(
        "GET_CRM_REQUIREMENT_PIPELINE_ERROR:",
        error
      );

      const message =
        error?.message ||
        "Failed to load requirement pipeline";

      const status =
        message ===
        "Requirement not found"
          ? 404
          : message ===
              "Requirement ID is required"
            ? 400
            : 500;

      return res.status(status).json({
        success: false,
        message: message,
      });
    }
  };

/* =========================================================
   GENERATE MATCHES
========================================================= */

export const generateCrmMatchesHandler =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error:
            "Requirement ID is required",
        });
      }

  const matches =
  await generateCrmMatches(id);

      return res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error: any) {
      console.error(
        "CRM_GENERATE_MATCHES_ERROR:",
        error
      );

      const message =
        error?.message ||
        "Failed to generate matches";

      let status = 500;

      if (
        message ===
        "Requirement not found"
      ) {
        status = 404;
      } else if (
        message === "Unauthorized"
      ) {
        status = 403;
      } else if (
        message ===
        "Authenticated user ID not found"
      ) {
        status = 401;
      } else if (
        message.includes("Only open") ||
        message.includes(
          "Preferred worker is required"
        )
      ) {
        status = 400;
      }

      return res.status(status).json({
        success: false,
        message: message,
      });
    }
  };

/* =========================================================
   BUILD ASSIGNMENT POOL
========================================================= */

export const buildCrmAssignmentPoolHandler =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error:
            "Requirement ID is required",
        });
      }

     const pool =
  await buildCrmAssignmentPool(id);

      return res.status(200).json({
        success: true,
        data: pool,
      });
    } catch (error: any) {
      console.error(
        "CRM_BUILD_ASSIGNMENT_POOL_ERROR:",
        error
      );

      const message =
        error?.message ||
        "Failed to build assignment pool";

      let status = 500;

      if (
        message ===
        "Requirement not found"
      ) {
        status = 404;
      } else if (
        message === "Unauthorized"
      ) {
        status = 403;
      } else if (
        message ===
        "Authenticated user ID not found"
      ) {
        status = 401;
      } else if (
        message.includes(
          "Requirement is no longer"
        ) ||
        message.includes(
          "No matching workers"
        ) ||
        message.includes(
          "Preferred worker"
        )
      ) {
        status = 400;
      }

      return res.status(status).json({
        success: false,
        message: message,
      });
    }
  };

/* =========================================================
   ASSIGN WORKER
========================================================= */

export const assignCrmRequirementWorkerHandler =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      const {
        workerProfileId,
      } = req.body ?? {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error:
            "Requirement ID is required",
        });
      }

      if (
        !workerProfileId ||
        typeof workerProfileId !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "workerProfileId is required",
        });
      }

      const assignment =
  await assignCrmRequirementWorker(
    id,
    workerProfileId
  );

      return res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (error: any) {
      console.error(
        "CRM_ASSIGN_WORKER_ERROR:",
        error
      );

      const message =
        error?.message ||
        "Failed to assign worker";

      let status = 500;

      if (
        message ===
        "Requirement not found"
      ) {
        status = 404;
      } else if (
        message === "Unauthorized"
      ) {
        status = 403;
      } else if (
        message ===
        "Authenticated user ID not found"
      ) {
        status = 401;
      } else if (
        message.includes(
          "worker"
        ) ||
        message.includes(
          "Worker"
        ) ||
        message.includes(
          "Required worker count"
        ) ||
        message.includes(
          "Requirement is no longer"
        )
      ) {
        status = 400;
      }

      return res.status(status).json({
        success: false,
        message: message,
      });
    }
  };