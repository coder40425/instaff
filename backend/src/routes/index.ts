import express from "express";
import authRoutes from "../modules/auth/auth.routes";
import testRoutes from "../modules/auth/auth.test";
import workerRoutes from "../modules/worker/worker.routes";
import discoveryRoutes from "../modules/discovery/worker.discovery.routes";
import bookingRoutes from "../modules/booking/booking.routes";
import reviewRoutes from "../modules/review/review.routes";
import customerRoutes from "../modules/customer/customer.routes";
import adminRoutes from "../modules/admin/admin.routes";
import complaintsRoutes from "../modules/complaints/complaints.routes";
import categoryRoutes from "../modules/categories/category.routes";
import app from "../app";
import requirementRoutes from "../modules/requirement/requirement.routes";
import matchingRoutes from "../modules/matching/matching.routes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/test", testRoutes);
router.use("/worker", workerRoutes);
router.use(
  "/workers",
  discoveryRoutes
);
router.use("/bookings", bookingRoutes);
router.use(
  "/reviews",
  reviewRoutes
);

router.use(
  "/customer",
  customerRoutes
);

router.use("/admin", adminRoutes);

router.use(
  "/complaints",
  complaintsRoutes
);

router.use(
  "/categories",
  categoryRoutes
);

router.use("/requirements", requirementRoutes);
router.use("/matching", matchingRoutes);
export default router;