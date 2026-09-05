import prisma from "../../config/prisma";

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
      isVerified: true,
      isSuspended: false,
      isAvailable: true,

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

  const matches: MatchResult[] = [];

  for (const worker of workers) {
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
      score,
      reason: reasons.join(", "),
    });
  }

  const workerRatings = new Map(
    workers.map((worker) => [
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

// ── Generate Requirement Matches ─────────────────────────────────────────────

export const generateRequirementMatches = async (
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

  const existingCandidates =
    await prisma.requirementCandidate.findMany({
      where: {
        requirementId,
      },
      select: {
        workerProfileId: true,
        status: true,
      },
    });

  const existingStatus = new Map(
    existingCandidates.map((candidate) => [
      candidate.workerProfileId,
      candidate.status,
    ])
  );

  await prisma.requirement.update({
    where: {
      id: requirementId,
    },
    data: {
      status: "MATCHING",
    },
  });

  for (
    let index = 0;
    index < matches.length;
    index++
  ) {
    const match = matches[index];

    const previousStatus =
      existingStatus.get(match.workerProfileId);

    // Never destroy a candidate's progress
    // when matching runs again.
    const shouldPreserveStatus =
      previousStatus === "SHORTLISTED" ||
      previousStatus === "PRIMARY" ||
      previousStatus === "BACKUP" ||
      previousStatus === "ASSIGNED";

    await prisma.requirementCandidate.upsert({
      where: {
        requirementId_workerProfileId: {
          requirementId,
          workerProfileId:
            match.workerProfileId,
        },
      },

      create: {
        requirementId,
        workerProfileId:
          match.workerProfileId,
        status: "RECOMMENDED",
        matchScore: match.score,
        matchReason: match.reason,
        rank: index + 1,
      },

      update: {
        matchScore: match.score,
        matchReason: match.reason,
        rank: index + 1,

        ...(shouldPreserveStatus
          ? {}
          : {
              status: "RECOMMENDED",
            }),
      },
    });
  }

  return prisma.requirementCandidate.findMany({
    where: {
      requirementId,
    },

    include: {
      workerProfile: {
        include: workerInclude,
      },
    },

    orderBy: {
      rank: "asc",
    },
  });
};