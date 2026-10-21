import prisma from "../../config/prisma";
import { customerWorkerSelect } from "../worker/worker.public";
import { assertRequirementOwner } from "../requirement/requirement.access";

type RequirementForMatching = {
  id: string;
  categoryId: string;
  subCategoryId: string;
  city: string;
  state: string | null;
  salaryBudget: number | null;
  minExperience: number;
  employmentTypes: string[];
  workMode: string | null;
  workGeography: string | null;
  preferredCountries: string[];

  assignmentMode:
    | "PREFERRED_SINGLE"
    | "SINGLE_WITH_BACKUP"
    | "BULK_WORKFORCE";

  preferredWorkerProfileId: string | null;
};

type MatchResult = {
  workerProfileId: string;
  partnerId: string | null;
  score: number;
  reason: string;
};

const workerInclude = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },

  skills: {
    include: {
      subCategory: {
        include: {
          category: true,
        },
      },
    },
  },

  locations: true,
} as const;

// ── Find Matching Workers ────────────────────────────────────────────────────

export const findMatchingWorkers = async (
  requirement: RequirementForMatching
): Promise<MatchResult[]> => {
  const workers = await prisma.workerProfile.findMany({
    where: {
      experience: {
        gte: requirement.minExperience,
      },

      skills: {
        some: {
          subCategoryId: requirement.subCategoryId,
        },
      },

      // Preferred single means ONLY the selected worker
      // can be matched.
      ...(requirement.assignmentMode === "PREFERRED_SINGLE" &&
      requirement.preferredWorkerProfileId
        ? {
            id: requirement.preferredWorkerProfileId,
          }
        : {}),

      // Worker can match through:
      // 1. Profile city
      // 2. Any saved WorkerLocation
      OR: [
        {
          city: {
            equals: requirement.city,
            mode: "insensitive",
          },
        },
        {
          locations: {
            some: {
              city: {
                equals: requirement.city,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },

    include: workerInclude,
  });

  const [activeBookings, activeAssignments] = await Promise.all([
    prisma.booking.findMany({
      where: {
        workerId: { in: workers.map((worker) => worker.userId) },
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
      },
      select: { workerId: true },
    }),
    prisma.requirementCandidate.findMany({
      where: {
        workerProfileId: { in: workers.map((worker) => worker.id) },
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: { status: { in: ["OPEN", "MATCHING", "FILLED"] } },
      },
      select: { workerProfileId: true },
    }),
  ]);
  const activeBookingWorkerIds = new Set(
    activeBookings.map((booking) => booking.workerId)
  );
  const activeRequirementAssignmentIds = new Set(
    activeAssignments.map((assignment) => assignment.workerProfileId)
  );
  const eligibleWorkers = workers.filter(
    (worker) =>
      worker.isVerified &&
      !worker.isSuspended &&
      worker.isAvailable &&
      !activeBookingWorkerIds.has(worker.userId) &&
      !activeRequirementAssignmentIds.has(worker.id)
  );

  const matches: MatchResult[] = [];

  for (const worker of eligibleWorkers) {
    let score = 0;
    const reasons: string[] = [];

    // Required skill
    score += 40;
    reasons.push("Required work type matched");

    // City
    if (
      worker.city &&
      worker.city.toLowerCase() === requirement.city.toLowerCase()
    ) {
      score += 20;
      reasons.push("City matched");
    } else {
      const savedLocation = worker.locations.find(
        (location) =>
          location.city.toLowerCase() ===
          requirement.city.toLowerCase()
      );

      if (savedLocation) {
        score += 20;
        reasons.push("Saved work location matched");
      }
    }

    // State
    const workerStateMatched =
      !!requirement.state &&
      (
        worker.state?.toLowerCase() ===
          requirement.state.toLowerCase() ||
        worker.locations.some(
          (location) =>
            location.state?.toLowerCase() ===
            requirement.state!.toLowerCase()
        )
      );

    if (workerStateMatched) {
      score += 5;
      reasons.push("State matched");
    }

    // Experience
    if (worker.experience >= requirement.minExperience) {
      score += 15;
      reasons.push("Experience requirement met");
    }

    // Salary
    if (requirement.salaryBudget !== null) {
      if (worker.expectedSalary <= requirement.salaryBudget) {
        score += 10;
        reasons.push("Salary budget matched");
      } else {
        score += 3;
        reasons.push("Salary expectation above budget");
      }
    }

    // Employment type
    if (
      requirement.employmentTypes.length > 0 &&
      worker.employmentTypes.some((type) =>
        requirement.employmentTypes.includes(type)
      )
    ) {
      score += 10;
      reasons.push("Employment type matched");
    }

    // Work mode
    if (
      requirement.workMode &&
      worker.workMode === requirement.workMode
    ) {
      score += 5;
      reasons.push("Work mode matched");
    }

    // Work geography
    if (
      requirement.workGeography &&
      worker.workGeography === requirement.workGeography
    ) {
      score += 5;
      reasons.push("Work geography matched");
    }

    // International preferred country
    if (
      requirement.workGeography === "INTERNATIONAL" &&
      requirement.preferredCountries.length > 0
    ) {
      const workerCountries =
        worker.preferredCountries.map((country) =>
          country.toLowerCase()
        );

      const matchingCountry =
        requirement.preferredCountries.some((country) =>
          workerCountries.includes(country.toLowerCase())
        );

      if (matchingCountry) {
        score += 5;
        reasons.push("Preferred country matched");
      }
    }

    // Preferred worker priority
    if (
      requirement.assignmentMode === "PREFERRED_SINGLE" &&
      requirement.preferredWorkerProfileId === worker.id
    ) {
      score += 100;
      reasons.push("Preferred worker selected");
    }

    matches.push({
      workerProfileId: worker.id,
      partnerId: worker.partnerId,
      score,
      reason: reasons.join(", "),
    });
  }

  const workerRatings = new Map(
    eligibleWorkers.map((worker) => [
      worker.id,
      worker.rating ?? 0,
    ])
  );

  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      (workerRatings.get(b.workerProfileId) ?? 0) -
      (workerRatings.get(a.workerProfileId) ?? 0)
    );
  });

  return matches;
};

export const getRequirementMatchingExclusionSummary = async (
  requirement: RequirementForMatching
) => {
  const workers = await prisma.workerProfile.findMany({
    where: {
      experience: { gte: requirement.minExperience },
      skills: { some: { subCategoryId: requirement.subCategoryId } },
      ...(requirement.assignmentMode === "PREFERRED_SINGLE" &&
      requirement.preferredWorkerProfileId
        ? { id: requirement.preferredWorkerProfileId }
        : {}),
      OR: [
        { city: { equals: requirement.city, mode: "insensitive" } },
        {
          locations: {
            some: { city: { equals: requirement.city, mode: "insensitive" } },
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      isVerified: true,
      isSuspended: true,
      isAvailable: true,
    },
  });

  if (!workers.length) {
    return "No workers meet the requirement's subcategory, minimum experience, city/work-location and preferred-worker criteria.";
  }

  const [activeBookings, activeAssignments] = await Promise.all([
    prisma.booking.findMany({
      where: {
        workerId: { in: workers.map((worker) => worker.userId) },
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
      },
      select: { workerId: true },
    }),
    prisma.requirementCandidate.findMany({
      where: {
        workerProfileId: { in: workers.map((worker) => worker.id) },
        status: "ASSIGNED",
        replacementRequestsCurrent: { none: { status: "RESOLVED" } },
        requirement: { status: { in: ["OPEN", "MATCHING", "FILLED"] } },
      },
      select: { workerProfileId: true },
    }),
  ]);
  const activeBookingIds = new Set(activeBookings.map(({ workerId }) => workerId));
  const activeAssignmentIds = new Set(
    activeAssignments.map(({ workerProfileId }) => workerProfileId)
  );
  const reasons: string[] = [];
  const bookedCount = workers.filter((worker) => activeBookingIds.has(worker.userId)).length;
  const assignedCount = workers.filter((worker) => activeAssignmentIds.has(worker.id)).length;
  const unverifiedCount = workers.filter((worker) => !worker.isVerified).length;
  const suspendedCount = workers.filter((worker) => worker.isSuspended).length;
  const unavailableCount = workers.filter((worker) => !worker.isAvailable).length;

  if (bookedCount) {
    reasons.push(
      `${bookedCount} potential worker(s) have an active booking in ACCEPTED or IN_PROGRESS status; scheduled dates do not automatically clear it`
    );
  }
  if (assignedCount) {
    reasons.push(`${assignedCount} potential worker(s) have an active requirement assignment`);
  }
  if (unverifiedCount) reasons.push(`${unverifiedCount} potential worker(s) are not verified`);
  if (suspendedCount) reasons.push(`${suspendedCount} potential worker(s) are suspended`);
  if (unavailableCount) reasons.push(`${unavailableCount} potential worker(s) are marked unavailable`);

  return reasons.length
    ? `No eligible workers remain: ${reasons.join("; ")}.`
    : "No eligible workers remain in the current matching pool.";
};

// ── Generate Requirement Matches ─────────────────────────────────────────────

export const generateRequirementMatches = async (
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
    requirement.status !== "OPEN" &&
    requirement.status !== "MATCHING"
  ) {
    throw new Error(
      "Only open requirements can be matched"
    );
  }

  if (
    requirement.assignmentMode === "PREFERRED_SINGLE" &&
    !requirement.preferredWorkerProfileId
  ) {
    throw new Error(
      "Preferred worker is required for preferred single assignment"
    );
  }

  const matches =
    await findMatchingWorkers(requirement);

  const owningPartner =
    requirement.source === "PARTNER_CLIENT"
      ? await prisma.partnerProfile.findUnique({
          where: { userId: requirement.createdById },
          select: { id: true },
        })
      : null;

  return prisma.$transaction(async (tx) => {
    // Serialize matching against cancellation and assignment transitions.
    const matching = await tx.requirement.updateMany({
      where: {
        id: requirementId,
        status: { in: ["OPEN", "MATCHING"] },
      },
      data: { status: "MATCHING" },
    });
    if (matching.count !== 1) {
      throw new Error("Only open requirements can be matched");
    }

    const existingCandidates = await tx.requirementCandidate.findMany({
      where: { requirementId },
      select: { workerProfileId: true, status: true },
    });
    const existingStatus = new Map(
      existingCandidates.map((candidate) => [
        candidate.workerProfileId,
        candidate.status,
      ])
    );

    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const previousStatus = existingStatus.get(match.workerProfileId);

      // Never destroy a candidate's progress when matching runs again.
      const shouldPreserveStatus =
        previousStatus === "SHORTLISTED" ||
        previousStatus === "PRIMARY" ||
        previousStatus === "BACKUP" ||
        previousStatus === "OFFERED" ||
        previousStatus === "ASSIGNED" ||
        previousStatus === "REJECTED" ||
        previousStatus === "EXPIRED";

      await tx.requirementCandidate.upsert({
        where: {
          requirementId_workerProfileId: {
            requirementId,
            workerProfileId: match.workerProfileId,
          },
        },
        create: {
          requirementId,
          workerProfileId: match.workerProfileId,
          status: "RECOMMENDED",
          matchScore: match.score,
          matchReason: match.reason,
          rank: index + 1,
          partnerId: owningPartner?.id ?? match.partnerId,
        },
        update: {
          matchScore: match.score,
          matchReason: match.reason,
          rank: index + 1,
          ...(shouldPreserveStatus ? {} : { status: "RECOMMENDED" }),
        },
      });
    }

    return tx.requirementCandidate.findMany({
      where: { requirementId },
      select: {
        id: true,
        requirementId: true,
        workerProfileId: true,
        status: true,
        matchScore: true,
        matchReason: true,
        rank: true,
        assignedAt: true,
        createdAt: true,
        updatedAt: true,
        workerProfile: { select: customerWorkerSelect },
      },
      orderBy: { rank: "asc" },
    });
  });
};
