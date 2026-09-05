import express from "express";

import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  generateMatchesHandler,
  buildAssignmentPoolHandler,
  assignRequirementWorkerHandler,
} from "./matching.controller";

const router = express.Router();

router.use(
  authMiddleware,
  authorizeRoles(
    "CUSTOMER",
    "EMPLOYER",
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

export default router;