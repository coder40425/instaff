import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorizeRoles } from "../../middleware/roleMiddleware";

import {
  createBookingHandler,
  myBookings,
  workerBookings,
  bookingDetails,
  acceptBookingHandler,
  rejectBookingHandler,
  customerStartBookingHandler,
  completeBookingHandler,
  cancelBookingHandler,
  cancelWorkerBookingHandler,
  markPaidHandler,
  replacementHandler,
  noShowHandler,
  confirmPaymentHandler,
} from "./booking.controller";

const router = express.Router();

router.use(authMiddleware);

// Customer routes
router.post("/",                                    authorizeRoles("CUSTOMER"), createBookingHandler);
router.get("/my",                                   authorizeRoles("CUSTOMER"), myBookings);
router.patch("/:id/customer-start",                 authorizeRoles("CUSTOMER"), customerStartBookingHandler);
router.patch("/:id/customer-complete",              authorizeRoles("CUSTOMER"), completeBookingHandler);
router.patch("/:id/cancel",                         authorizeRoles("CUSTOMER"), cancelBookingHandler);
router.patch("/:id/pay",                            authorizeRoles("CUSTOMER"), markPaidHandler);
router.patch("/:id/replacement",                    authorizeRoles("CUSTOMER"), replacementHandler);
router.patch("/:id/no-show",                        authorizeRoles("CUSTOMER"), noShowHandler);

// Worker routes
router.get("/worker/my",                            authorizeRoles("WORKER"),   workerBookings);
router.patch("/worker/:id/cancel",                  authorizeRoles("WORKER"),   cancelWorkerBookingHandler);
router.patch("/:id/accept",                         authorizeRoles("WORKER"),   acceptBookingHandler);
router.patch("/:id/reject",                         authorizeRoles("WORKER"),   rejectBookingHandler);
router.patch("/:id/confirm-payment",                authorizeRoles("WORKER"),   confirmPaymentHandler);

// Shared
router.get("/:id",                                  bookingDetails);

export default router;
