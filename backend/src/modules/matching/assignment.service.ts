import prisma from "../../config/prisma";

// ── Build Assignment Pool ────────────────────────────────────────────────────

export const buildAssignmentPool = async (
  requirementId: string,
  userId: string
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

  if (requirement.createdById !== userId) {
    throw new Error("Unauthorized");
  }

  if (
    requirement.status === "CANCELLED" ||
    requirement.status === "COMPLETED" ||
    requirement.status === "FILLED"
  ) {
    throw new Error(
      "Requirement is no longer available"
    );
  }

  const candidates =
    await prisma.requirementCandidate.findMany({
      where: {
        requirementId,

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
      "No matching workers found for this requirement"
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

    include: {
      workerProfile: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
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
  userId: string
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

  if (requirement.createdById !== userId) {
    throw new Error("Unauthorized");
  }

  if (
    requirement.status === "CANCELLED" ||
    requirement.status === "COMPLETED" ||
    requirement.status === "FILLED"
  ) {
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

  const candidate =
    await prisma.requirementCandidate.findUnique({
      where: {
        requirementId_workerProfileId: {
          requirementId,
          workerProfileId,
        },
      },

      include: {
        workerProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
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

  if (
    candidate.status === "REJECTED" ||
    candidate.status === "EXPIRED"
  ) {
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

  const result =
    await prisma.$transaction(async (tx) => {
      const existingAssignments =
        await tx.requirementCandidate.count({
          where: {
            requirementId,
            status: "ASSIGNED",
          },
        });

      if (
        existingAssignments >=
        requirement.requiredWorkerCount
      ) {
        throw new Error(
          "Required worker count has already been filled"
        );
      }

      const updatedCandidate =
        await tx.requirementCandidate.update({
          where: {
            id: candidate.id,
          },

          data: {
            status: "ASSIGNED",
            assignedAt: new Date(),
          },

          include: {
            workerProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        });

      const newAssignedCount =
        existingAssignments + 1;

      // Your actual Prisma enum has no
      // PARTIALLY_FILLED status.
      const newStatus =
        newAssignedCount >=
        requirement.requiredWorkerCount
          ? "FILLED"
          : "MATCHING";

      await tx.requirement.update({
        where: {
          id: requirementId,
        },

        data: {
          status: newStatus,

          ...(newStatus === "FILLED"
            ? {
                completedAt: new Date(),
              }
            : {}),
        },
      });

      return updatedCandidate;
    });

  return result;
};