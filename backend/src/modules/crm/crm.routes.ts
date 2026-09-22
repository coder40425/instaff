import express from "express";

import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  getCrmOverviewHandler,
  getCrmRequirementsHandler,
  getCrmRequirementByIdHandler,
  getCrmRequirementPipelineHandler,
  generateCrmMatchesHandler,
  buildCrmAssignmentPoolHandler,
  assignCrmRequirementWorkerHandler,
} from "./crm.controller";

const router = express.Router();

/* =========================================================
   CRM ACCESS
   CRM is an ADMIN operational module.
========================================================= */

router.use(
  authMiddleware,
  authorizeRoles("ADMIN")
);

/* =========================================================
   OVERVIEW
========================================================= */

router.get(
  "/overview",
  getCrmOverviewHandler
);

/* =========================================================
   REQUIREMENTS
========================================================= */

router.get(
  "/requirements",
  getCrmRequirementsHandler
);

router.get(
  "/requirements/:id",
  getCrmRequirementByIdHandler
);

router.get(
  "/requirements/:id/pipeline",
  getCrmRequirementPipelineHandler
);

/* =========================================================
   MATCHING
========================================================= */

router.post(
  "/requirements/:id/match",
  generateCrmMatchesHandler
);

/* =========================================================
   ASSIGNMENT
========================================================= */

router.post(
  "/requirements/:id/assignment-pool",
  buildCrmAssignmentPoolHandler
);

router.post(
  "/requirements/:id/assign",
  assignCrmRequirementWorkerHandler
);

export default router;