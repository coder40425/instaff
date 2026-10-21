import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  pendingPartners, allPartners, approvePartnerHandler, rejectPartnerHandler,
  suspendPartnerHandler, reactivatePartnerHandler, partnerVerificationDetails,
  approvePartnerSubmissionHandler, rejectPartnerSubmissionHandler,
  approvePartnerDocumentHandler, rejectPartnerDocumentHandler,
  pendingWorkers, approveWorkerHandler, rejectWorkerHandler,
  suspendWorkerHandler, reactivateWorkerHandler,
  bookings, analytics,
  reassignBookingHandler, forceCancelBookingHandler, forceCompleteBookingHandler,
  replacementCandidates,
  getPaymentInfo, updatePaymentInfo,
  workerWallets, settleWallet, workerWalletDetail,
} from "./admin.controller";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("ADMIN"));

// Partners
router.get("/partners", allPartners);
router.get("/partners/pending", pendingPartners);
router.patch("/partners/:partnerProfileId/approve", approvePartnerHandler);
router.patch("/partners/:partnerProfileId/reject", rejectPartnerHandler);
router.patch("/partners/:partnerProfileId/suspend", suspendPartnerHandler);
router.patch("/partners/:partnerProfileId/reactivate", reactivatePartnerHandler);
router.get("/partners/:partnerProfileId/verification", partnerVerificationDetails);
router.patch(
  "/partners/:partnerProfileId/submissions/:submissionId/approve",
  approvePartnerSubmissionHandler
);
router.patch(
  "/partners/:partnerProfileId/submissions/:submissionId/reject",
  rejectPartnerSubmissionHandler
);
router.patch(
  "/partners/:partnerProfileId/documents/:documentId/approve",
  approvePartnerDocumentHandler
);
router.patch(
  "/partners/:partnerProfileId/documents/:documentId/reject",
  rejectPartnerDocumentHandler
);

// Workers
router.get("/workers/pending", pendingWorkers);
router.patch("/workers/:userId/approve", approveWorkerHandler);
router.patch("/workers/:userId/reject", rejectWorkerHandler);
router.patch("/workers/:userId/suspend", suspendWorkerHandler);
router.patch("/workers/:userId/reactivate", reactivateWorkerHandler);

// Bookings
router.get("/bookings", bookings);
router.patch("/bookings/:id/complete", forceCompleteBookingHandler);
router.patch("/bookings/:id/cancel", forceCancelBookingHandler);
router.patch("/bookings/:id/reassign", reassignBookingHandler);
router.get("/bookings/:id/replacement-candidates", replacementCandidates);

// Analytics
router.get("/analytics", analytics);

// Payment Info
router.get("/payment-info", getPaymentInfo);
router.put("/payment-info", updatePaymentInfo);

// Wallets
router.get("/wallets", workerWallets);
router.get("/wallets/:workerProfileId", workerWalletDetail);
router.patch("/wallets/:workerProfileId/settle", settleWallet);

export default router;
