import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";
import {
  addAssociatedWorker,
  associatedWorkers,
  deleteAssociatedWorker,
  ownProfile,
  updateOwnProfile,
} from "./partner.controller";
import { requireApprovedPartner } from "../../middleware/partnerMiddleware";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("PARTNER"));

// Pending Partners can view their own approval status.
router.get("/profile", ownProfile);
router.put("/profile", updateOwnProfile);

// Worker association is an operational capability and requires approval.
router.get("/workers", requireApprovedPartner, associatedWorkers);
router.post("/workers", requireApprovedPartner, addAssociatedWorker);
router.delete(
  "/workers/:workerProfileId",
  requireApprovedPartner,
  deleteAssociatedWorker
);

export default router;
