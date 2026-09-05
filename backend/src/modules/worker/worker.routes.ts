import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  createProfile,
  earnings,
  getCategories,
  getPlatformPaymentInfoHandler,
  getProfile,
  getWallet,
  updateProfile,
  updateWorkerLocation,
  toggleAvailability,
  getWorkerLocationsHandler,
addWorkerLocationHandler,
deleteWorkerLocationHandler,
setPrimaryWorkerLocationHandler,
} from "./worker.controller";

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get("/categories", getCategories);

// ── Worker-authenticated ──────────────────────────────────────────────────────
router.use(authMiddleware, authorizeRoles("WORKER"));

router.post("/profile", createProfile);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.patch("/availability", toggleAvailability);
router.patch("/location", updateWorkerLocation);
router.get("/earnings", earnings);
router.get("/wallet", getWallet);
router.get("/payment-info", getPlatformPaymentInfoHandler);

router.get(
  "/locations",
  getWorkerLocationsHandler
);

router.post(
  "/locations",
  addWorkerLocationHandler
);

router.delete(
  "/locations/:locationId",
  deleteWorkerLocationHandler
);

router.patch(
  "/locations/:locationId/primary",
  setPrimaryWorkerLocationHandler
);

export default router;