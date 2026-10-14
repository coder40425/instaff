import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { customerWorkerSelect } from "../worker/worker.public";
import { assertRequirementOwner } from "../requirement/requirement.access";
import {
  findMatchingWorkers,
  getRequirementMatchingExclusionSummary,
} from "./matching.service";

const ACTIVE_REQUIREMENT_STATUSES = ["OPEN", "MATCHING", "FILLED"] as const;
const ASSIGNABLE_CANDIDATE_STATUSES = [
  "RECOMMENDED",
  "SHORTLISTED",
  "PRIMARY",
  "BACKUP",
] as const;

export const releaseWorkerAvailabilityIfIdle = async (
  tx: Prisma.TransactionClient,
  workerUserId: string
) => {
  const worker = await tx.workerProfile.findUnique({
    where: { userId: workerUserId },
    select: { id: true },
  });
  if (!worker) return;

  // Availability claims and releases share this row lock. This prevents a
  // completion/cancellation from setting a worker online after a new claim.
  await tx.workerProfile.updateMany({
    where: { id: worker.id },
    data: { updatedAt: new Date() },
  });

  const [activeBooking, activeRequirementAssignment] = await Promise.all([
    tx.booking.findFirst({
      where: {
        workerId: workerUserId,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
      },
      select: { id: true },
    }),
    tx.requirementCandidate.findFirst({
      where: {
        workerProfileId: worker.id,
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: { status: { in: [...ACTIVE_REQUIREMENT_STATUSES] } },
      },
      select: { id: true },
    }),
  ]);

  if (!activeBooking && !activeRequirementAssignment) {
    await tx.workerProfile.updateMany({
      where: { id: worker.id },
      data: { isAvailable: true },
    });
  }
};

// ── Build Assignment Pool ────────────────────────────────────────────────────

export const buildAssignmentPool = async (
  requirementId: string,
  userId: string,
  isAdmin = false
) => {
  const requirement =
    await prisma.requirement.findUnique({
      where: {
        id: requirementId,
      },
    });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  await assertRequirementOwner(userId, requirement, isAdmin);

  if (
    requirement.status === "CANCELLED" ||
    requirement.status === "COMPLETED" ||
    requirement.status === "FILLED"
  ) {
    throw new Error(
      "Requirement is no longer available"
    );
  }

  const currentlyEligibleWorkers = await findMatchingWorkers(requirement);
  if (currentlyEligibleWorkers.length === 0) {
    throw new Error(await getRequirementMatchingExclusionSummary(requirement));
  }

  const candidates =
    await prisma.requirementCandidate.findMany({
      where: {
        requirementId,
        workerProfileId: {
          in: currentlyEligibleWorkers.map((worker) => worker.workerProfileId),
        },

        status: {
          in: [
            "RECOMMENDED",
            "SHORTLISTED",
            "PRIMARY",
            "BACKUP",
          ],
        },
      },

      orderBy: [
        {
          rank: "asc",
        },
        {
          matchScore: "desc",
        },
      ],
    });

  if (candidates.length === 0) {
    throw new Error(
      "Workers currently meet the matching criteria, but none has an unassigned candidate in the recommendation pool. Run matching again to refresh candidates."
    );
  }

  // Preferred single:
  // only one worker should be PRIMARY.
  if (requirement.assignmentMode === "PREFERRED_SINGLE") {
    if (!requirement.preferredWorkerProfileId) {
      throw new Error(
        "Preferred worker is required for preferred single assignment"
      );
    }

    const preferredCandidate =
      candidates.find(
        (candidate) =>
          candidate.workerProfileId ===
          requirement.preferredWorkerProfileId
      );

    if (!preferredCandidate) {
      throw new Error(
        "Preferred worker is not available in the matching candidates"
      );
    }

    await prisma.$transaction([
      prisma.requirementCandidate.updateMany({
        where: {
          requirementId,
          status: {
            in: [
              "PRIMARY",
              "BACKUP",
            ],
          },
          workerProfileId: {
            not: requirement.preferredWorkerProfileId,
          },
        },
        data: {
          status: "RECOMMENDED",
        },
      }),

      prisma.requirementCandidate.update({
        where: {
          id: preferredCandidate.id,
        },
        data: {
          status: "PRIMARY",
        },
      }),
    ]);
  } else {
    // Single-with-backup:
    // 1 PRIMARY + backupPoolSize BACKUP workers.
    //
    // Bulk workforce:
    // requiredWorkerCount PRIMARY workers +
    // backupPoolSize BACKUP workers.

    const primaryCount =
      requirement.assignmentMode ===
      "BULK_WORKFORCE"
        ? requirement.requiredWorkerCount
        : 1;

    const selectedCandidates =
      candidates.slice(
        0,
        primaryCount + requirement.backupPoolSize
      );

    const primaryCandidates =
      selectedCandidates.slice(0, primaryCount);

    const backupCandidates =
      selectedCandidates.slice(
        primaryCount,
        primaryCount + requirement.backupPoolSize
      );

    const selectedIds = new Set(
      selectedCandidates.map(
        (candidate) => candidate.id
      )
    );

    await prisma.$transaction(async (tx) => {
      // Reset previous pool candidates that are
      // not part of the newly calculated pool.
      await tx.requirementCandidate.updateMany({
        where: {
          requirementId,
          status: {
            in: [
              "PRIMARY",
              "BACKUP",
            ],
          },
          id: {
            notIn: Array.from(selectedIds),
          },
        },
        data: {
          status: "RECOMMENDED",
        },
      });

      if (primaryCandidates.length > 0) {
        await tx.requirementCandidate.updateMany({
          where: {
            id: {
              in: primaryCandidates.map(
                (candidate) => candidate.id
              ),
            },
          },
          data: {
            status: "PRIMARY",
          },
        });
      }

      if (backupCandidates.length > 0) {
        await tx.requirementCandidate.updateMany({
          where: {
            id: {
              in: backupCandidates.map(
                (candidate) => candidate.id
              ),
            },
          },
          data: {
            status: "BACKUP",
          },
        });
      }
    });
  }

  return prisma.requirementCandidate.findMany({
  where: {
    requirementId,
  },

  select: {
    id: true,
    requirementId: true,
    workerProfileId: true,
    status: true,
    matchScore: true,
    matchReason: true,
    rank: true,
    offeredAt: true,
    acceptedAt: true,
    assignedAt: true,
    createdAt: true,
    updatedAt: true,

    workerProfile: {
      select: customerWorkerSelect,
    },
  },

  orderBy: [
    {
      status: "asc",
    },
    {
      rank: "asc",
    },
  ],
});
};

// ── Assign Requirement Worker ─────────────────────────────────────────────────

export const assignRequirementWorker = async (
  requirementId: string,
  workerProfileId: string,
  userId: string,
  isAdmin = false,
  replacementRequestId?: string
) => {
  const isReplacement = Boolean(replacementRequestId);
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  await assertRequirementOwner(userId, requirement, isAdmin);

  const allowedRequirementStatuses = isReplacement
    ? ACTIVE_REQUIREMENT_STATUSES
    : (["OPEN", "MATCHING"] as const);
  if (!allowedRequirementStatuses.includes(requirement.status as never)) {
    throw new Error(
      "Requirement is no longer available for assignment"
    );
  }

  // Preferred-single can ONLY assign
  // the explicitly selected worker.
  if (
    requirement.assignmentMode === "PREFERRED_SINGLE" &&
    requirement.preferredWorkerProfileId !==
      workerProfileId
  ) {
    throw new Error(
      "Only the preferred worker can be assigned to this requirement"
    );
  }

  const candidate = await prisma.requirementCandidate.findUnique({
    where: {
      requirementId_workerProfileId: { requirementId, workerProfileId },
    },
    include: {
      workerProfile: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  if (!candidate) {
    throw new Error(
      "Worker is not a candidate for this requirement"
    );
  }

  if (candidate.status === "ASSIGNED") {
    throw new Error(
      "Worker is already assigned to this requirement"
    );
  }

  if (candidate.status === "OFFERED") {
    throw new Error("Worker already has a pending offer");
  }

  if (!ASSIGNABLE_CANDIDATE_STATUSES.includes(candidate.status as never)) {
    throw new Error(
      "Worker is not eligible for assignment"
    );
  }

  const worker = candidate.workerProfile;

  if (!worker.isVerified) {
    throw new Error(
      "Worker is not verified"
    );
  }

  if (worker.isSuspended) {
    throw new Error(
      "Worker is suspended"
    );
  }

  if (!worker.isAvailable) {
    throw new Error(
      "Worker is currently unavailable"
    );
  }

  if (
    worker.experience <
    requirement.minExperience
  ) {
    throw new Error(
      "Worker does not meet the experience requirement"
    );
  }

  const owningPartner =
    requirement.source === "PARTNER_CLIENT"
      ? await prisma.partnerProfile.findUnique({
          where: { userId: requirement.createdById },
          select: { id: true },
        })
      : null;

  const result = await prisma.$transaction(async (tx) => {
    // Lock the requirement row so concurrent offer and acceptance requests
    // see the same active-slot count.
    const locked = await tx.requirement.updateMany({
      where: {
        id: requirementId,
        status: { in: [...allowedRequirementStatuses] },
      },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) {
      throw new Error("Requirement is no longer available for assignment");
    }

    const freshCandidate = await tx.requirementCandidate.findUnique({
      where: { id: candidate.id },
    });
    if (
      !freshCandidate ||
      !ASSIGNABLE_CANDIDATE_STATUSES.includes(freshCandidate.status as never)
    ) {
      throw new Error("Worker is not eligible for assignment");
    }

    // Recheck and lock the candidate worker inside the same transaction so
    // an offer cannot be sent after another workflow has claimed the worker.
    const workerLock = await tx.workerProfile.updateMany({
      where: {
        id: freshCandidate.workerProfileId,
        isVerified: true,
        isSuspended: false,
        isAvailable: true,
      },
      data: { updatedAt: new Date() },
    });
    if (workerLock.count !== 1) {
      throw new Error("Worker is currently unavailable");
    }

    const [activeBooking, activeRequirementAssignment] = await Promise.all([
      tx.booking.findFirst({
        where: {
          workerId: worker.userId,
          status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        },
        select: { id: true },
      }),
      tx.requirementCandidate.findFirst({
        where: {
          workerProfileId: freshCandidate.workerProfileId,
          status: "ASSIGNED",
          replacementRequestsCurrent: { none: { status: "RESOLVED" } },
          requirement: { status: { in: [...ACTIVE_REQUIREMENT_STATUSES] } },
        },
        select: { id: true },
      }),
    ]);
    if (activeBooking || activeRequirementAssignment) {
      throw new Error("Worker already has an active assignment");
    }

    let replacementRequest = null;
    if (replacementRequestId) {
      replacementRequest = await tx.replacementRequest.findFirst({
        where: {
          id: replacementRequestId,
          requirementId,
          status: "OPEN",
          replacementCandidateId: null,
          currentAssignmentCandidate: {
            status: "ASSIGNED",
            replacementRequestsCurrent: {
              none: { status: "RESOLVED" },
            },
          },
        },
        include: {
          currentAssignmentCandidate: {
            select: { id: true },
          },
        },
      });
      if (!replacementRequest) {
        throw new Error("Replacement request is no longer open");
      }
    }

    const activeAssignments = await tx.requirementCandidate.findMany({
      where: {
        requirementId,
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
      },
      select: { id: true },
    });
    if (!isReplacement && activeAssignments.length >= requirement.requiredWorkerCount) {
      throw new Error("Required worker count has already been filled");
    }
    if (activeAssignments.length > requirement.requiredWorkerCount) {
      throw new Error("Requirement already has more assignments than required");
    }

    const updated = await tx.requirementCandidate.updateMany({
      where: {
        id: freshCandidate.id,
        status: { in: [...ASSIGNABLE_CANDIDATE_STATUSES] },
      },
      data: {
        status: "OFFERED",
        offeredAt: new Date(),
        ...(freshCandidate.partnerId
          ? {}
          : {
              partnerId: owningPartner?.id ?? worker.partnerId ?? null,
            }),
      },
    });
    if (updated.count !== 1) {
      throw new Error("Worker is no longer eligible for assignment");
    }

    if (replacementRequest) {
      const requestUpdated = await tx.replacementRequest.updateMany({
        where: {
          id: replacementRequest.id,
          status: "OPEN",
          replacementCandidateId: null,
        },
        data: {
          status: "OFFERED",
          replacementCandidateId: freshCandidate.id,
        },
      });
      if (requestUpdated.count !== 1) {
        throw new Error("Replacement request is no longer open");
      }
    }

    return freshCandidate.id;
  });

  return prisma.requirementCandidate.findUnique({
    where: { id: result },
    select: {
      id: true,
      requirementId: true,
      workerProfileId: true,
      status: true,
      matchScore: true,
      matchReason: true,
      rank: true,
      offeredAt: true,
      acceptedAt: true,
      assignedAt: true,
      createdAt: true,
      updatedAt: true,
      workerProfile: { select: customerWorkerSelect },
    },
  });
};

export const requestAssignmentReplacement = async (
  requirementId: string,
  candidateId: string,
  userId: string,
  reason: string,
  isAdmin = false
) => {
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
  });
  if (!requirement) throw new Error("Requirement not found");
  await assertRequirementOwner(userId, requirement, isAdmin);

  const normalizedReason = reason.trim();
  if (normalizedReason.length < 3) {
    throw new Error("Replacement reason is required");
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.requirement.updateMany({
      where: {
        id: requirementId,
        status: { in: [...ACTIVE_REQUIREMENT_STATUSES] },
      },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) {
      throw new Error("Requirement is no longer active");
    }

    const currentAssignment = await tx.requirementCandidate.findFirst({
      where: {
        id: candidateId,
        requirementId,
        status: "ASSIGNED",
        replacementRequestsCurrent: {
          none: { status: { in: ["OPEN", "OFFERED", "RESOLVED"] } },
        },
      },
      select: { id: true },
    });
    if (!currentAssignment) {
      throw new Error("Only an active confirmed assignment can be replaced");
    }

    return tx.replacementRequest.create({
      data: {
        requirementId,
        currentAssignmentCandidateId: currentAssignment.id,
        requestedById: userId,
        reason: normalizedReason,
      },
      include: {
        currentAssignmentCandidate: {
          select: {
            id: true,
            workerProfile: { select: customerWorkerSelect },
          },
        },
      },
    });
  });
};

export const cancelAssignmentReplacement = async (
  requirementId: string,
  replacementRequestId: string,
  userId: string,
  isAdmin = false
) => {
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
  });
  if (!requirement) throw new Error("Requirement not found");
  await assertRequirementOwner(userId, requirement, isAdmin);

  return prisma.$transaction(async (tx) => {
    const locked = await tx.requirement.updateMany({
      where: {
        id: requirementId,
        status: { in: [...ACTIVE_REQUIREMENT_STATUSES] },
      },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) {
      throw new Error("Requirement is no longer active");
    }

    const request = await tx.replacementRequest.findFirst({
      where: {
        id: replacementRequestId,
        requirementId,
        status: { in: ["OPEN", "OFFERED"] },
      },
      select: { id: true, replacementCandidateId: true },
    });
    if (!request) throw new Error("Replacement request is no longer open");

    const updated = await tx.replacementRequest.updateMany({
      where: {
        id: request.id,
        status: { in: ["OPEN", "OFFERED"] },
      },
      data: { status: "CANCELLED" },
    });
    if (updated.count !== 1) {
      throw new Error("Replacement request is no longer open");
    }

    if (request.replacementCandidateId) {
      await tx.requirementCandidate.updateMany({
        where: {
          id: request.replacementCandidateId,
          status: "OFFERED",
        },
        data: { status: "EXPIRED", expiredAt: new Date() },
      });
    }

    return tx.replacementRequest.findUnique({
      where: { id: request.id },
      include: {
        currentAssignmentCandidate: {
          select: { id: true, workerProfile: { select: customerWorkerSelect } },
        },
        replacementCandidate: {
          select: { id: true, workerProfile: { select: customerWorkerSelect } },
        },
      },
    });
  });
};
