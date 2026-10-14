import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { releaseWorkerAvailabilityIfIdle } from "../matching/assignment.service";
import {
  cancelBookingWithRole,
  includeBookingCancellationMetadata,
} from "../booking/cancellation.service";

const partnerAdminSelect = {
  id: true,
  partnerType: true,
  status: true,
  workerLimit: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} as const;

export const getPendingPartners = () =>
  prisma.partnerProfile.findMany({
    where: { status: "PENDING" },
    select: partnerAdminSelect,
    orderBy: { createdAt: "asc" },
  });

export const getAllPartners = () =>
  prisma.partnerProfile.findMany({
    select: partnerAdminSelect,
    orderBy: { createdAt: "desc" },
  });

const updatePartnerStatus = async (
  partnerProfileId: string,
  currentStatus: "PENDING" | "APPROVED" | "SUSPENDED",
  nextStatus: "APPROVED" | "REJECTED" | "SUSPENDED"
) => {
  const updated = await prisma.partnerProfile.updateMany({
    where: { id: partnerProfileId, status: currentStatus },
    data: { status: nextStatus },
  });

  if (updated.count !== 1) {
    const partner = await prisma.partnerProfile.findUnique({
      where: { id: partnerProfileId },
      select: { id: true, status: true },
    });
    if (!partner) throw new Error("Partner not found");
    throw new Error(`Partner must be ${currentStatus.toLowerCase()} to change to ${nextStatus.toLowerCase()}`);
  }

  return prisma.partnerProfile.findUnique({
    where: { id: partnerProfileId },
    select: partnerAdminSelect,
  });
};

export const approvePartner = (partnerProfileId: string) =>
  updatePartnerStatus(partnerProfileId, "PENDING", "APPROVED");

export const rejectPartner = (partnerProfileId: string) =>
  updatePartnerStatus(partnerProfileId, "PENDING", "REJECTED");

export const suspendPartner = (partnerProfileId: string) =>
  updatePartnerStatus(partnerProfileId, "APPROVED", "SUSPENDED");

export const reactivatePartner = (partnerProfileId: string) =>
  updatePartnerStatus(partnerProfileId, "SUSPENDED", "APPROVED");

export const getPartnerVerificationDetails = async (partnerProfileId: string) => {
  const partner = await prisma.partnerProfile.findUnique({
    where: { id: partnerProfileId },
    select: {
      id: true,
      partnerType: true,
      status: true,
      createdAt: true,
      businessName: true,
      contactPerson: true,
      email: true,
      alternatePhone: true,
      profilePhotoUrl: true,
      businessRegistrationNumber: true,
      panNumber: true,
      gstin: true,
      website: true,
      description: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      district: true,
      state: true,
      postalCode: true,
      country: true,
      user: { select: { id: true, name: true, phone: true } },
      documents: {
        select: {
          id: true,
          documentType: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          verificationStatus: true,
          reviewedBy: true,
          reviewedAt: true,
          rejectionReason: true,
          createdAt: true,
          submissionId: true,
        },
        orderBy: { createdAt: "desc" },
      },
      verificationSubmissions: {
        select: {
          id: true,
          proposedChanges: true,
          status: true,
          submittedAt: true,
          reviewedBy: true,
          reviewedAt: true,
          rejectionReason: true,
          documents: {
            select: {
              id: true,
              documentType: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              verificationStatus: true,
              reviewedBy: true,
              reviewedAt: true,
              rejectionReason: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!partner) throw new Error("Partner not found");
  return partner;
};

const readProposedChanges = (value: Prisma.JsonValue) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Verification submission has invalid proposed changes");
  }

  const allowedFields = new Set([
    "name",
    "businessRegistrationNumber",
    "panNumber",
    "gstin",
  ]);
  const changes: Record<string, string | null> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (!allowedFields.has(key)) {
      throw new Error("Verification submission contains an unsupported field");
    }
    if (fieldValue !== null && typeof fieldValue !== "string") {
      throw new Error("Verification submission contains an invalid field value");
    }
    if (typeof fieldValue === "string" && fieldValue.trim() !== fieldValue) {
      throw new Error("Verification submission contains an unnormalized field value");
    }
    if (key === "name" && (typeof fieldValue !== "string" || fieldValue.length < 1 || fieldValue.length > 100)) {
      throw new Error("Verification submission contains an invalid account name");
    }
    if (key === "businessRegistrationNumber" && typeof fieldValue === "string" && fieldValue.length > 100) {
      throw new Error("Verification submission contains an invalid business registration number");
    }
    if (key === "panNumber" && fieldValue !== null && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(fieldValue!)) {
      throw new Error("Verification submission contains an invalid PAN");
    }
    if (key === "gstin" && fieldValue !== null && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(fieldValue!)) {
      throw new Error("Verification submission contains an invalid GSTIN");
    }
    changes[key] = fieldValue;
  }
  if (Object.keys(changes).length === 0) {
    throw new Error("Verification submission has no proposed changes");
  }
  return changes;
};

export const approvePartnerVerificationSubmission = async (
  partnerProfileId: string,
  submissionId: string,
  reviewerId: string
) =>
  prisma.$transaction(async (tx) => {
    const submission = await tx.partnerVerificationSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, partnerProfileId: true, proposedChanges: true, status: true },
    });
    if (!submission || submission.partnerProfileId !== partnerProfileId) {
      throw new Error("Verification submission not found for this Partner");
    }
    if (submission.status !== "PENDING") {
      throw new Error("Verification submission is no longer pending review");
    }

    const changes = readProposedChanges(submission.proposedChanges);
    const claimed = await tx.partnerVerificationSubmission.updateMany({
      where: { id: submissionId, partnerProfileId, status: "PENDING" },
      data: { status: "APPROVED", reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason: null },
    });
    if (claimed.count !== 1) throw new Error("Verification submission is no longer pending review");

    const profileChanges: Prisma.PartnerProfileUpdateInput = {};
    if (Object.prototype.hasOwnProperty.call(changes, "businessRegistrationNumber")) {
      profileChanges.businessRegistrationNumber = changes.businessRegistrationNumber;
    }
    if (Object.prototype.hasOwnProperty.call(changes, "panNumber")) profileChanges.panNumber = changes.panNumber;
    if (Object.prototype.hasOwnProperty.call(changes, "gstin")) profileChanges.gstin = changes.gstin;
    if (Object.keys(profileChanges).length > 0) {
      await tx.partnerProfile.update({ where: { id: partnerProfileId }, data: profileChanges });
    }
    if (Object.prototype.hasOwnProperty.call(changes, "name")) {
      const partner = await tx.partnerProfile.findUnique({
        where: { id: partnerProfileId },
        select: { userId: true },
      });
      if (!partner) throw new Error("Partner not found");
      await tx.user.update({ where: { id: partner.userId }, data: { name: changes.name! } });
    }

    return tx.partnerVerificationSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      select: { id: true, status: true, reviewedBy: true, reviewedAt: true, rejectionReason: true },
    });
  });

export const rejectPartnerVerificationSubmission = async (
  partnerProfileId: string,
  submissionId: string,
  reviewerId: string,
  reason: string
) => {
  const result = await prisma.partnerVerificationSubmission.updateMany({
    where: { id: submissionId, partnerProfileId, status: "PENDING" },
    data: { status: "REJECTED", reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason: reason },
  });
  if (result.count !== 1) {
    const submission = await prisma.partnerVerificationSubmission.findUnique({
      where: { id: submissionId },
      select: { partnerProfileId: true, status: true },
    });
    if (!submission || submission.partnerProfileId !== partnerProfileId) {
      throw new Error("Verification submission not found for this Partner");
    }
    throw new Error("Verification submission is no longer pending review");
  }
  return prisma.partnerVerificationSubmission.findUniqueOrThrow({
    where: { id: submissionId },
    select: { id: true, status: true, reviewedBy: true, reviewedAt: true, rejectionReason: true },
  });
};

const reviewPartnerDocument = async (
  partnerProfileId: string,
  documentId: string,
  reviewerId: string,
  status: "VERIFIED" | "REJECTED",
  rejectionReason: string | null
) => {
  const result = await prisma.partnerDocument.updateMany({
    where: {
      id: documentId,
      partnerProfileId,
      verificationStatus: "PENDING",
    },
    data: {
      verificationStatus: status,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason,
    },
  });
  if (result.count !== 1) {
    const document = await prisma.partnerDocument.findUnique({
      where: { id: documentId },
      select: { partnerProfileId: true, verificationStatus: true },
    });
    if (!document || document.partnerProfileId !== partnerProfileId) {
      throw new Error("Document not found for this Partner");
    }
    throw new Error("Document is no longer pending review");
  }
  return prisma.partnerDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { id: true, verificationStatus: true, reviewedBy: true, reviewedAt: true, rejectionReason: true },
  });
};

export const approvePartnerDocument = (
  partnerProfileId: string,
  documentId: string,
  reviewerId: string
) => reviewPartnerDocument(partnerProfileId, documentId, reviewerId, "VERIFIED", null);

export const rejectPartnerDocument = (
  partnerProfileId: string,
  documentId: string,
  reviewerId: string,
  reason: string
) => reviewPartnerDocument(partnerProfileId, documentId, reviewerId, "REJECTED", reason);

export const getPendingWorkers = async () => {
  return prisma.workerProfile.findMany({
    where: { isVerified: false, rejectionReason: null },
    include: {
      user: true,
      skills: { include: { subCategory: { include: { category: true } } } },
    },
  });
};

export const approveWorker = async (userId: string, adminId: string) => {
  return prisma.workerProfile.update({
    where: { userId },
    data: { isVerified: true, verifiedAt: new Date(), verifiedBy: adminId, rejectionReason: null },
  });
};

export const rejectWorker = async (userId: string, reason: string) => {
  return prisma.workerProfile.update({ where: { userId }, data: { isVerified: false, rejectionReason: reason } });
};

export const suspendWorker = async (userId: string, reason: string) => {
  return prisma.workerProfile.update({ where: { userId }, data: { isSuspended: true, suspensionReason: reason } });
};

export const reactivateWorker = async (userId: string) => {
  return prisma.workerProfile.update({ where: { userId }, data: { isSuspended: false, suspensionReason: null } });
};

export const getAllBookings = async () => {
  const bookings = await prisma.booking.findMany({
    include: { subCategory: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
  return bookings.map(includeBookingCancellationMetadata);
};

export const getAnalytics = async () => {
  const totalCustomers    = await prisma.user.count({ where: { role: "CUSTOMER" } });
  const totalWorkers      = await prisma.user.count({ where: { role: "WORKER" } });
  const verifiedWorkers   = await prisma.workerProfile.count({ where: { isVerified: true } });
  const totalBookings     = await prisma.booking.count();
  const completedBookings = await prisma.booking.count({ where: { status: "COMPLETED" } });
  const revenueData       = await prisma.booking.aggregate({ _sum: { platformFee: true } });
  const totalPendingPayouts = await prisma.workerWallet.aggregate({ _sum: { pendingBalance: true } });

  return {
    totalCustomers,
    totalWorkers,
    verifiedWorkers,
    totalBookings,
    completedBookings,
    totalRevenue:        revenueData._sum.platformFee || 0,
    totalPendingPayouts: totalPendingPayouts._sum.pendingBalance || 0,
  };
};

export const forceCompleteBooking = async (bookingId: string) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await releaseWorkerAvailabilityIfIdle(tx, booking.workerId);
    return booking;
  });
};

export const forceCancelBooking = (bookingId: string, reason: unknown) =>
  cancelBookingWithRole(bookingId, { role: "ADMIN" }, reason);

export const reassignBooking = async (
  bookingId: string,
  newWorkerId: string
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (
    booking.status === "COMPLETED" ||
    booking.status === "CANCELLED"
  ) {
    throw new Error("Cannot assign a worker to a closed booking");
  }

  const worker = await prisma.workerProfile.findUnique({
    where: { userId: newWorkerId },
    include: {
      user: true,
      skills: {
        include: {
          subCategory: true,
        },
      },
    },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  if (!worker.isVerified) {
    throw new Error("Worker not verified");
  }

  if (worker.isSuspended) {
    throw new Error("Worker suspended");
  }

  if (!worker.isAvailable) {
    throw new Error("Worker unavailable");
  }

  const activeRequirementAssignment = await prisma.requirementCandidate.findFirst({
    where: {
      workerProfileId: worker.id,
      status: "ASSIGNED",
      replacementRequestsCurrent: { none: { status: "RESOLVED" } },
      requirement: { status: { in: ["OPEN", "MATCHING", "FILLED"] } },
    },
    select: { id: true },
  });
  if (activeRequirementAssignment) {
    throw new Error("Worker already has an active assignment");
  }

  // Worker must actually provide the required work type
  const hasRequiredSkill = worker.skills.some(
    (skill) => skill.subCategoryId === booking.subCategoryId
  );

  if (!hasRequiredSkill) {
    throw new Error(
      "Worker does not offer the required service"
    );
  }

  // Don't assign the same worker again
  if (booking.workerId === newWorkerId) {
    throw new Error("This worker is already assigned");
  }

  const result = await prisma.$transaction(async (tx) => {
    const lockedBooking = await tx.booking.findFirst({
      where: {
        id: bookingId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      select: { id: true },
    });
    if (!lockedBooking) throw new Error("Cannot assign a worker to a closed booking");

    const activeRequirementAssignment = await tx.requirementCandidate.findFirst({
      where: {
        workerProfileId: worker.id,
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: { status: { in: ["OPEN", "MATCHING", "FILLED"] } },
      },
      select: { id: true },
    });
    if (activeRequirementAssignment) {
      throw new Error("Worker already has an active assignment");
    }

    // Update booking
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        workerId: newWorkerId,
        workerName: worker.user.name,
        workerPhone: worker.user.phone,

        // New worker must accept the assignment
        status: "PENDING",
        acceptedAt: null,

        // Record replacement information
        replacementWorkerId: newWorkerId,
        replacementAssignedAt: new Date(),
      },

      include: {
        subCategory: {
          include: {
            category: true,
          },
        },
      },
    });

    await releaseWorkerAvailabilityIfIdle(tx, booking.workerId);

    return updatedBooking;
  });

  return result;
};

export const getReplacementCandidates = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found");

  return prisma.workerProfile.findMany({
    where: {
      isVerified: true, isAvailable: true, isSuspended: false,
      city: booking.city, userId: { not: booking.workerId },
      skills: { some: { subCategoryId: booking.subCategoryId } },
    },
    include: {
      user: true,
      skills: { include: { subCategory: { include: { category: true } } } },
    },
  });
};

// ── Platform Payment Info ─────────────────────────────────────────────────────

export const getPlatformPaymentInfo = async () => {
  // Always return the first (and only) record
  return prisma.platformPaymentInfo.findFirst();
};

export const upsertPlatformPaymentInfo = async (
  adminId: string,
  data: { upiId: string; upiName: string; qrImageUrl?: string }
) => {
  const existing = await prisma.platformPaymentInfo.findFirst();

  if (existing) {
    return prisma.platformPaymentInfo.update({
      where: { id: existing.id },
      data: { ...data, updatedBy: adminId },
    });
  }

  return prisma.platformPaymentInfo.create({
    data: { ...data, updatedBy: adminId },
  });
};

// ── Wallet / Settlement ───────────────────────────────────────────────────────

export const getAllWorkerWallets = async () => {
  return prisma.workerWallet.findMany({
    include: {
      workerProfile: {
        include: {
          user:   { select: { id: true, name: true, phone: true } },
          skills: { include: { subCategory: true }, take: 3 },
        },
      },
      settlements: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { pendingBalance: "desc" },
  });
};

export const settleWorkerWallet = async (workerProfileId: string, adminId: string, note?: string) => {
  const wallet = await prisma.workerWallet.findUnique({ where: { workerProfileId } });
  if (!wallet)                    throw new Error("Wallet not found");
  if (wallet.pendingBalance <= 0) throw new Error("No pending balance to settle");

  const amount = wallet.pendingBalance;

  await prisma.workerWallet.update({
    where: { id: wallet.id },
    data:  { pendingBalance: 0, settledBalance: { increment: amount } },
  });

  await prisma.walletTransaction.create({
    data: { walletId: wallet.id, type: "DEBIT", amount, description: note || "Admin settlement" },
  });

  const settlement = await prisma.settlement.create({
    data: { walletId: wallet.id, settledBy: adminId, amount, note: note || null },
  });

  return {
    wallet: await prisma.workerWallet.findUnique({ where: { id: wallet.id } }),
    settlement,
  };
};

export const getWorkerWalletById = async (workerProfileId: string) => {
  const wallet = await prisma.workerWallet.findUnique({
    where: { workerProfileId },
    include: {
      workerProfile: { include: { user: { select: { id: true, name: true, phone: true } } } },
      transactions:  { orderBy: { createdAt: "desc" } },
      settlements:   { orderBy: { createdAt: "desc" } },
    },
  });
  if (!wallet) throw new Error("Wallet not found");
  return wallet;
};
