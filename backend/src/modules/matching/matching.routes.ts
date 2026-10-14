import express from "express";

import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  generateMatchesHandler,
  buildAssignmentPoolHandler,
  assignRequirementWorkerHandler,
  requestAssignmentReplacementHandler,
  cancelAssignmentReplacementHandler,
} from "./matching.controller";

const router = express.Router();

router.use(
  authMiddleware,
  authorizeRoles(
    "CUSTOMER",
    "EMPLOYER",
    "PARTNER",
    "ADMIN"
  )
);

router.post(
  "/requirements/:id/match",
  generateMatchesHandler
);

router.post(
  "/requirements/:id/assignment-pool",
  buildAssignmentPoolHandler
);

router.post(
  "/requirements/:id/assign",
  assignRequirementWorkerHandler
);

router.post(
  "/requirements/:id/candidates/:candidateId/replacements",
  requestAssignmentReplacementHandler
);

router.patch(
  "/requirements/:id/replacements/:replacementRequestId/cancel",
  cancelAssignmentReplacementHandler
);

export default router;
