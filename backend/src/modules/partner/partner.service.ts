import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { customerWorkerSelect } from "../worker/worker.public";
import {
  effectivePartnerWorkerLimit,
  PartnerType,
} from "./partner.constants";

const ACTIVE_REQUIREMENT_STATUSES = ["OPEN", "MATCHING", "FILLED"] as const;
const ACTIVE_BOOKING_STATUSES = ["ACCEPTED", "IN_PROGRESS"] as const;

type WorkerStatusSource = {
  id: string;
  userId: string;
  isVerified: boolean;
  isAvailable: boolean;
  isSuspended: boolean;
};

export type PartnerWorkerOperationalStatus =
  | "AVAILABLE"
  | "BUSY"
  | "ON_DUTY"
  | "OFFLINE"
  | "SUSPENDED";

const resolveWorkerOperationalStatuses = async (
  workers: WorkerStatusSource[]
) => {
  const workerIds = workers.map((worker) => worker.id);
  const userIds = workers.map((worker) => worker.userId);
  if (!workers.length) return new Map<string, PartnerWorkerOperationalStatus | null>();

  const [activeAssignments, activeBookings] = await Promise.all([
    prisma.requirementCandidate.findMany({
      where: {
        workerProfileId: { in: workerIds },
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: { status: { in: [...ACTIVE_REQUIREMENT_STATUSES] } },
      },
      select: { workerProfileId: true },
    }),
    prisma.booking.findMany({
      where: {
        workerId: { in: userIds },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { workerId: true, status: true, startedAt: true },
    }),
  ]);

  const busyWorkerIds = new Set(activeAssignments.map((assignment) => assignment.workerProfileId));
  const workerIdByUserId = new Map(workers.map((worker) => [worker.userId, worker.id]));
  const onDutyWorkerIds = new Set(
    activeBookings
      .filter((booking) => booking.status === "IN_PROGRESS" && booking.startedAt !== null)
      .map((booking) => workerIdByUserId.get(booking.workerId))
      .filter((workerId): workerId is string => workerId !== undefined)
  );
  for (const booking of activeBookings) {
    const workerId = workerIdByUserId.get(booking.workerId);
    if (workerId) busyWorkerIds.add(workerId);
  }

  return new Map(
    workers.map((worker) => {
      let status: PartnerWorkerOperationalStatus | null = null;
      if (onDutyWorkerIds.has(worker.id)) status = "ON_DUTY";
      else if (busyWorkerIds.has(worker.id)) status = "BUSY";
      else if (worker.isSuspended) status = "SUSPENDED";
      else if (worker.isVerified) status = worker.isAvailable ? "AVAILABLE" : "OFFLINE";
      return [worker.id, status];
    })
  );
};

export const getOwnPartnerProfile = async (userId: string) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      partnerType: true,
      status: true,
      workerLimit: true,
      createdAt: true,
    },
  });

  if (!profile) throw new Error("Partner profile not found");

  const workerCount = await prisma.workerProfile.count({
    where: { partnerId: profile.id },
  });
  const workerLimit = effectivePartnerWorkerLimit(
    profile.partnerType as PartnerType,
    profile.workerLimit
  );

  return {
    id: profile.id,
    partnerType: profile.partnerType,
    status: profile.status,
    workerLimit,
    workerCount,
    createdAt: profile.createdAt,
  };
};

export const updateOwnPartnerProfile = async (userId: string, name: string) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new Error("Partner profile not found");

  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { name: true },
  });
};

export const listAssociatedWorkers = async (partnerProfileId: string) => {
  const workers = await prisma.workerProfile.findMany({
    where: { partnerId: partnerProfileId },
    select: { ...customerWorkerSelect, isSuspended: true },
    orderBy: { createdAt: "desc" },
  });
  const statuses = await resolveWorkerOperationalStatuses(workers);
  return workers.map(({ isSuspended: _isSuspended, ...worker }) => ({
    ...worker,
    operationalStatus: statuses.get(worker.id) ?? null,
  }));
};

export const getPartnerDashboardSummary = async (
  partnerProfileId: string,
  userId: string
) => {
  const workers = await prisma.workerProfile.findMany({
    where: { partnerId: partnerProfileId },
    select: {
      id: true,
      userId: true,
      isVerified: true,
      isAvailable: true,
      isSuspended: true,
    },
  });
  const now = new Date();
  const requirementOwner = {
    createdById: userId,
    source: "PARTNER_CLIENT" as const,
  };

  const [statuses, openRequirements, pendingOffers, confirmedAssignments, upcomingAssignments, openReplacementRequests] = await Promise.all([
    resolveWorkerOperationalStatuses(workers),
    prisma.requirement.count({
      where: { ...requirementOwner, status: { in: ["OPEN", "MATCHING"] } },
    }),
    prisma.requirementCandidate.count({
      where: {
        status: "OFFERED",
        requirement: {
          ...requirementOwner,
          status: { in: [...ACTIVE_REQUIREMENT_STATUSES] },
        },
        replacementRequestsReplacement: { none: { status: "CANCELLED" } },
      },
    }),
    prisma.requirementCandidate.count({
      where: {
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: {
          ...requirementOwner,
          status: { in: [...ACTIVE_REQUIREMENT_STATUSES] },
        },
      },
    }),
    prisma.requirementCandidate.count({
      where: {
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: {
          ...requirementOwner,
          status: { in: [...ACTIVE_REQUIREMENT_STATUSES] },
          joiningDate: { gte: now },
        },
      },
    }),
    prisma.replacementRequest.count({
      where: {
        status: { in: ["OPEN", "OFFERED"] },
        requirement: {
          ...requirementOwner,
          status: { in: [...ACTIVE_REQUIREMENT_STATUSES] },
        },
      },
    }),
  ]);

  const statusCounts = {
    available: 0,
    busy: 0,
    onDuty: 0,
  };
  for (const status of statuses.values()) {
    if (status === "AVAILABLE") statusCounts.available += 1;
    else if (status === "BUSY") statusCounts.busy += 1;
    else if (status === "ON_DUTY") statusCounts.onDuty += 1;
  }

  return {
    workforce: {
      total: workers.length,
      ...statusCounts,
      verificationPending: workers.filter((worker) => !worker.isVerified).length,
    },
    assignments: {
      openRequirements,
      pendingOffers,
      confirmedAssignments,
      upcomingAssignments,
      openReplacementRequests,
    },
  };
};

const lockApprovedPartner = async (
  tx: Prisma.TransactionClient,
  partnerProfileId: string
) => {
  const locked = await tx.partnerProfile.updateMany({
    where: { id: partnerProfileId, status: "APPROVED" },
    data: { updatedAt: new Date() },
  });

  if (locked.count !== 1) {
    throw new Error("Partner account is not approved");
  }

  const partner = await tx.partnerProfile.findUnique({
    where: { id: partnerProfileId },
    select: { partnerType: true, workerLimit: true },
  });
  if (!partner) throw new Error("Partner profile not found");
  return partner;
};

export const associateWorker = async (
  partnerProfileId: string,
  workerProfileId: string
) =>
  prisma.$transaction(async (tx) => {
    const partner = await lockApprovedPartner(tx, partnerProfileId);
    const worker = await tx.workerProfile.findUnique({
      where: { id: workerProfileId },
      select: {
        id: true,
        partnerId: true,
        isVerified: true,
        isSuspended: true,
      },
    });

    if (!worker) throw new Error("Worker not found");
    if (!worker.isVerified) throw new Error("Worker is not verified");
    if (worker.isSuspended) throw new Error("Worker is suspended");
    if (worker.partnerId === partnerProfileId) {
      return tx.workerProfile.findUniqueOrThrow({
        where: { id: workerProfileId },
        select: customerWorkerSelect,
      });
    }
    if (worker.partnerId) {
      throw new Error("Worker is already associated with another Partner");
    }

    const currentCount = await tx.workerProfile.count({
      where: { partnerId: partnerProfileId },
    });
    const limit = effectivePartnerWorkerLimit(
      partner.partnerType as PartnerType,
      partner.workerLimit
    );
    if (limit !== null && currentCount >= limit) {
      throw new Error(`Partner worker limit of ${limit} has been reached`);
    }

    const updated = await tx.workerProfile.updateMany({
      where: {
        id: workerProfileId,
        partnerId: null,
        isVerified: true,
        isSuspended: false,
      },
      data: { partnerId: partnerProfileId },
    });

    if (updated.count !== 1) {
      throw new Error("Worker is no longer eligible for association");
    }

    return tx.workerProfile.findUniqueOrThrow({
      where: { id: workerProfileId },
      select: customerWorkerSelect,
    });
  });

export const removeAssociatedWorker = async (
  partnerProfileId: string,
  workerProfileId: string
) =>
  prisma.$transaction(async (tx) => {
    await lockApprovedPartner(tx, partnerProfileId);

    const removed = await tx.workerProfile.updateMany({
      where: { id: workerProfileId, partnerId: partnerProfileId },
      data: { partnerId: null },
    });

    if (removed.count !== 1) {
      throw new Error("Worker is not associated with this Partner");
    }

    return { workerProfileId, partnerId: null };
  });
