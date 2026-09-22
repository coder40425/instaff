import {
  Prisma,
  RequirementCandidateStatus,
  RequirementStatus,
} from "@prisma/client";

import prisma from "../../config/prisma";

import { customerWorkerSelect } from "../worker/worker.public";

import {
  generateRequirementMatches,
} from "../matching/matching.service";

import {
  buildAssignmentPool,
  assignRequirementWorker,
} from "../matching/assignment.service";

/* =========================================================
   TYPES
========================================================= */

export interface CrmRequirementFilters {
  status?: RequirementStatus;
  search?: string;
  city?: string;
  categoryId?: string;
  subCategoryId?: string;
  page?: number;
  limit?: number;
}

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* =========================================================
   PAGINATION
========================================================= */

const normalizePagination = (
  page?: number,
  limit?: number
) => {
  const safePage =
    typeof page === "number" &&
    Number.isFinite(page) &&
    page > 0
      ? Math.floor(page)
      : DEFAULT_PAGE;

  const safeLimit =
    typeof limit === "number" &&
    Number.isFinite(limit) &&
    limit > 0
      ? Math.min(
          Math.floor(limit),
          MAX_LIMIT
        )
      : DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

/* =========================================================
   REQUIREMENT WHERE
========================================================= */

const buildRequirementWhere = (
  filters: CrmRequirementFilters = {}
): Prisma.RequirementWhereInput => {
  const {
    status,
    search,
    city,
    categoryId,
    subCategoryId,
  } = filters;

  const where: Prisma.RequirementWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (city?.trim()) {
    where.city = {
      contains: city.trim(),
      mode: "insensitive",
    };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (subCategoryId) {
    where.subCategoryId = subCategoryId;
  }

  if (search?.trim()) {
    const query = search.trim();

    where.OR = [
      {
        id: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        city: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        state: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        category: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        subCategory: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

/* =========================================================
   CRM CANDIDATE SELECT
========================================================= */

const crmCandidateSelect = {
  id: true,
  requirementId: true,
  workerProfileId: true,

  status: true,
  matchScore: true,
  matchReason: true,
  rank: true,

  notifiedAt: true,
  interestedAt: true,
  shortlistedAt: true,
  assignedAt: true,

  createdAt: true,
  updatedAt: true,

  workerProfile: {
    select: customerWorkerSelect,
  },
} satisfies Prisma.RequirementCandidateSelect;

/* =========================================================
   REQUIREMENT DETAIL SELECT
========================================================= */

const crmRequirementDetailSelect = {
  id: true,

  createdById: true,

  categoryId: true,
  subCategoryId: true,

  city: true,
  state: true,
  address: true,

  shiftTiming: true,
  salaryBudget: true,
  minExperience: true,

  joiningDate: true,
  requiredWorkerCount: true,

  employmentTypes: true,
  workMode: true,
  workGeography: true,
  preferredCountries: true,

  assignmentMode: true,
  backupPoolSize: true,
  preferredWorkerProfileId: true,

  status: true,

  createdAt: true,
  updatedAt: true,
  openedAt: true,
  completedAt: true,
  cancelledAt: true,

  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      sequence: true,
    },
  },

  subCategory: {
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
    },
  },

  candidates: {
    select: crmCandidateSelect,

    orderBy: [
      {
        rank: "asc",
      },
      {
        matchScore: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
  },
} satisfies Prisma.RequirementSelect;

/* =========================================================
   PIPELINE
========================================================= */

const buildPipeline = (
  candidates: Array<{
    status: RequirementCandidateStatus;
  }>
) => {
  const pipeline = {
    recommended: 0,
    shortlisted: 0,
    primary: 0,
    backup: 0,
    assigned: 0,
    rejected: 0,
    expired: 0,
  };

  for (const candidate of candidates) {
    switch (candidate.status) {
      case RequirementCandidateStatus.RECOMMENDED:
        pipeline.recommended++;
        break;

      case RequirementCandidateStatus.SHORTLISTED:
        pipeline.shortlisted++;
        break;

      case RequirementCandidateStatus.PRIMARY:
        pipeline.primary++;
        break;

      case RequirementCandidateStatus.BACKUP:
        pipeline.backup++;
        break;

      case RequirementCandidateStatus.ASSIGNED:
        pipeline.assigned++;
        break;

      case RequirementCandidateStatus.REJECTED:
        pipeline.rejected++;
        break;

      case RequirementCandidateStatus.EXPIRED:
        pipeline.expired++;
        break;
    }
  }

  return pipeline;
};

/* =========================================================
   1. CRM OVERVIEW
========================================================= */

export const getCrmOverview = async () => {
  const [
    openRequirements,
    matchingRequirements,
    filledRequirements,

    recommendedCandidates,
    shortlistedCandidates,
    primaryCandidates,
    backupCandidates,
    assignedCandidates,

    pendingWorkers,
    openComplaints,
    pendingBookings,

    activeRequirements,
  ] = await Promise.all([
    prisma.requirement.count({
      where: {
        status: RequirementStatus.OPEN,
      },
    }),

    prisma.requirement.count({
      where: {
        status: RequirementStatus.MATCHING,
      },
    }),

    prisma.requirement.count({
      where: {
        status: RequirementStatus.FILLED,
      },
    }),

    prisma.requirementCandidate.count({
      where: {
        status:
          RequirementCandidateStatus.RECOMMENDED,
      },
    }),

    prisma.requirementCandidate.count({
      where: {
        status:
          RequirementCandidateStatus.SHORTLISTED,
      },
    }),

    prisma.requirementCandidate.count({
      where: {
        status:
          RequirementCandidateStatus.PRIMARY,
      },
    }),

    prisma.requirementCandidate.count({
      where: {
        status:
          RequirementCandidateStatus.BACKUP,
      },
    }),

    prisma.requirementCandidate.count({
      where: {
        status:
          RequirementCandidateStatus.ASSIGNED,
      },
    }),

    prisma.workerProfile.count({
      where: {
        isVerified: false,
        rejectionReason: null,
      },
    }),

    prisma.complaint.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.booking.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.requirement.findMany({
      where: {
        status: {
          in: [
            RequirementStatus.OPEN,
            RequirementStatus.MATCHING,
          ],
        },
      },

      select: {
        id: true,
        requiredWorkerCount: true,
        status: true,

        candidates: {
          where: {
            status:
              RequirementCandidateStatus.ASSIGNED,
          },

          select: {
            id: true,
          },
        },
      },
    }),
  ]);

  let workersRequired = 0;
  let workersAssigned = 0;

  let requirementsNeedingMatching = 0;
  let requirementsNeedingAssignment = 0;

  for (const requirement of activeRequirements) {
    const required =
      requirement.requiredWorkerCount;

    const assigned =
      requirement.candidates.length;

    workersRequired += required;

    workersAssigned += Math.min(
      assigned,
      required
    );

    if (
      requirement.status ===
      RequirementStatus.OPEN
    ) {
      requirementsNeedingMatching++;
    }

    if (
      requirement.status ===
        RequirementStatus.MATCHING &&
      assigned < required
    ) {
      requirementsNeedingAssignment++;
    }
  }

  return {
    requirements: {
      open: openRequirements,
      matching: matchingRequirements,
      filled: filledRequirements,

      active:
        openRequirements +
        matchingRequirements,

      workersRequired,
      workersAssigned,

      workersRemaining: Math.max(
        workersRequired -
          workersAssigned,
        0
      ),
    },

    matching: {
      recommended:
        recommendedCandidates,

      shortlisted:
        shortlistedCandidates,

      primary:
        primaryCandidates,

      backup:
        backupCandidates,

      assigned:
        assignedCandidates,
    },

    attention: {
      pendingWorkers,

      requirementsNeedingMatching,

      requirementsNeedingAssignment,

      openComplaints,

      pendingBookings,
    },
  };
};

/* =========================================================
   2. RECENT REQUIREMENTS
========================================================= */

export const getRecentCrmRequirements =
  async (limit = 8) => {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 8, 1),
      20
    );

    return prisma.requirement.findMany({
      select: {
        id: true,

        city: true,
        state: true,

        joiningDate: true,
        requiredWorkerCount: true,

        assignmentMode: true,
        status: true,

        createdAt: true,
        updatedAt: true,

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        _count: {
          select: {
            candidates: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: safeLimit,
    });
  };

/* =========================================================
   3. RECENT ASSIGNMENTS
========================================================= */

export const getRecentCrmAssignments =
  async (limit = 8) => {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 8, 1),
      20
    );

    return prisma.requirementCandidate.findMany({
      where: {
        status:
          RequirementCandidateStatus.ASSIGNED,
      },

      select: {
        id: true,
        requirementId: true,
        workerProfileId: true,
        assignedAt: true,

        requirement: {
          select: {
            id: true,
            city: true,
            state: true,
            requiredWorkerCount: true,
            status: true,

            category: {
              select: {
                id: true,
                name: true,
              },
            },

            subCategory: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        workerProfile: {
          select: customerWorkerSelect,
        },
      },

      orderBy: {
        assignedAt: "desc",
      },

      take: safeLimit,
    });
  };

/* =========================================================
   4. REQUIREMENTS LIST
========================================================= */

export const getCrmRequirements = async (
  filters: CrmRequirementFilters = {}
) => {
  const {
    page,
    limit,
    skip,
  } = normalizePagination(
    filters.page,
    filters.limit
  );

  const where =
    buildRequirementWhere(filters);

  const [
    requirements,
    total,
  ] = await Promise.all([
    prisma.requirement.findMany({
      where,

      select: {
        id: true,

        city: true,
        state: true,

        joiningDate: true,
        requiredWorkerCount: true,

        assignmentMode: true,
        backupPoolSize: true,

        status: true,

        createdAt: true,
        updatedAt: true,

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            sequence: true,
          },
        },

        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            categoryId: true,
          },
        },

        _count: {
          select: {
            candidates: true,
          },
        },
      },

      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      skip,
      take: limit,
    }),

    prisma.requirement.count({
      where,
    }),
  ]);

  return {
    data: requirements,

    pagination: {
      page,
      limit,
      total,

      totalPages:
        total === 0
          ? 0
          : Math.ceil(total / limit),
    },
  };
};

/* =========================================================
   5. REQUIREMENT DETAIL
========================================================= */

export const getCrmRequirementById =
  async (
    requirementId: string
  ) => {
    if (!requirementId?.trim()) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    const requirement =
      await prisma.requirement.findUnique({
        where: {
          id: requirementId,
        },

        select:
          crmRequirementDetailSelect,
      });

    if (!requirement) {
      throw new Error(
        "Requirement not found"
      );
    }

    const pipeline = buildPipeline(
      requirement.candidates
    );

    return {
      ...requirement,

      candidatePipeline: pipeline,

      fulfillment: {
        required:
          requirement.requiredWorkerCount,

        assigned:
          pipeline.assigned,

        remaining: Math.max(
          requirement.requiredWorkerCount -
            pipeline.assigned,
          0
        ),
      },
    };
  };

/* =========================================================
   6. REQUIREMENT PIPELINE
========================================================= */

export const getCrmRequirementPipeline =
  async (
    requirementId: string
  ) => {
    if (!requirementId?.trim()) {
      throw new Error(
        "Requirement ID is required"
      );
    }

    const requirement =
      await prisma.requirement.findUnique({
        where: {
          id: requirementId,
        },

        select: {
          id: true,
          status: true,

          requiredWorkerCount: true,
          assignmentMode: true,
          backupPoolSize: true,

          candidates: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!requirement) {
      throw new Error(
        "Requirement not found"
      );
    }

    const pipeline = buildPipeline(
      requirement.candidates
    );

    return {
      requirementId:
        requirement.id,

      status:
        requirement.status,

      assignmentMode:
        requirement.assignmentMode,

      requiredWorkerCount:
        requirement.requiredWorkerCount,

      backupPoolSize:
        requirement.backupPoolSize,

      pipeline,

      fulfillment: {
        required:
          requirement.requiredWorkerCount,

        assigned:
          pipeline.assigned,

        remaining: Math.max(
          requirement.requiredWorkerCount -
            pipeline.assigned,
          0
        ),
      },
    };
  };

/* =========================================================
   7. PENDING WORKER COUNT
========================================================= */

export const getPendingWorkerCount =
  async () => {
    return prisma.workerProfile.count({
      where: {
        isVerified: false,
        rejectionReason: null,
      },
    });
  };

/* =========================================================
   8. GENERATE MATCHES
========================================================= */

export const generateCrmMatches =
  async (
    requirementId: string
  ) => {
    return generateRequirementMatches(
      requirementId,
      "",
      true
    );
  };

/* =========================================================
   9. BUILD ASSIGNMENT POOL
========================================================= */

export const buildCrmAssignmentPool =
  async (
    requirementId: string
  ) => {
    return buildAssignmentPool(
      requirementId,
      "",
      true
    );
  };

/* =========================================================
   10. ASSIGN WORKER
========================================================= */

export const assignCrmRequirementWorker =
  async (
    requirementId: string,
    workerProfileId: string
  ) => {
    return assignRequirementWorker(
      requirementId,
      workerProfileId,
      "",
      true
    );
  };