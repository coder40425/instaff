import express from "express";

import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  createRequirementHandler,
  getMyRequirementsHandler,
  getRequirementHandler,
  openRequirementHandler,
  cancelRequirementHandler,
  updateRequirementHandler,
} from "./requirement.controller";

const router = express.Router();

router.use(
  authMiddleware,
  authorizeRoles("CUSTOMER", "EMPLOYER")
);

router.post(
  "/",
  createRequirementHandler
);

router.get(
  "/my",
  getMyRequirementsHandler
);

router.get(
  "/:id",
  getRequirementHandler
);

router.patch(
  "/:id",
  updateRequirementHandler
);

router.patch(
  "/:id/open",
  openRequirementHandler
);

router.patch(
  "/:id/cancel",
  cancelRequirementHandler
);
export default router;