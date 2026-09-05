import prisma from "../../config/prisma";
import { generateRequirementMatches } from "../matching/matching.service";

const requirementInclude = {
  category: true,
  subCategory: true,

  candidates: {
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
          skills: {
            include: {
              subCategory: true,
            },
          },
        },
      },
    },

    orderBy: {
      rank: "asc" as const,
    },
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const validatePreferredWorker = async (
  preferredWorkerProfileId: string,
  subCategoryId: string
) => {
  const worker = await prisma.workerProfile.findUnique({
    where: {
      id: preferredWorkerProfileId,
    },

    include: {
      skills: true,
    },
  });

  if (!worker) {
    throw new Error("Preferred worker not found");
  }

  if (!worker.isVerified) {
    throw new Error("Preferred worker is not verified");
  }

  if (worker.isSuspended) {
    throw new Error("Preferred worker is suspended");
  }

  const hasSkill = worker.skills.some(
    (skill) => skill.subCategoryId === subCategoryId
  );

  if (!hasSkill) {
    throw new Error(
      "Preferred worker does not offer this work type"
    );
  }

  return worker;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Create Requirement                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export const createRequirement = async (
  userId: string,
  data: any
) => {
  const category = await prisma.category.findUnique({
    where: {
      id: data.categoryId,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const subCategory = await prisma.subCategory.findFirst({
    where: {
      id: data.subCategoryId,
      categoryId: data.categoryId,
    },
  });

  if (!subCategory) {
    throw new Error(
      "Sub-category does not belong to the selected category"
    );
  }

  /* Preferred Single validation */
  if (
    data.assignmentMode === "PREFERRED_SINGLE" &&
    !data.preferredWorkerProfileId
  ) {
    throw new Error(
      "Preferred worker is required for preferred single assignment"
    );
  }

  if (data.preferredWorkerProfileId) {
    await validatePreferredWorker(
      data.preferredWorkerProfileId,
      data.subCategoryId
    );
  }

  return prisma.requirement.create({
    data: {
      createdById: userId,

      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,

      city: data.city,
      state: data.state,
      address: data.address,

      shiftTiming: data.shiftTiming,
      salaryBudget: data.salaryBudget,
      minExperience: data.minExperience ?? 0,

      joiningDate: new Date(data.joiningDate),
      requiredWorkerCount: data.requiredWorkerCount ?? 1,

      employmentTypes: data.employmentTypes ?? [],
      workMode: data.workMode,
      workGeography: data.workGeography,
      preferredCountries: data.preferredCountries ?? [],

      assignmentMode:
        data.assignmentMode ?? "SINGLE_WITH_BACKUP",

      backupPoolSize:
        data.backupPoolSize ?? 10,

      preferredWorkerProfileId:
        data.preferredWorkerProfileId ?? null,

      // Prisma default is DRAFT.
      status: "DRAFT",
    },

    include: {
      category: true,
      subCategory: true,
    },
  });
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Get My Requirements                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export const getMyRequirements = async (
  userId: string
) => {
  return prisma.requirement.findMany({
    where: {
      createdById: userId,
    },

    include: requirementInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Get Requirement                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export const getRequirementById = async (
  requirementId: string,
  userId: string
) => {
  const requirement =
    await prisma.requirement.findUnique({
      where: {
        id: requirementId,
      },

      include: requirementInclude,
    });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  if (requirement.createdById !== userId) {
    throw new Error("Unauthorized");
  }

  return requirement;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Update Requirement                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export const updateRequirement = async (
  requirementId: string,
  userId: string,
  data: any
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

  // Requirements can only be edited while still being a draft.
  if (requirement.status !== "DRAFT") {
    throw new Error(
      "Only draft requirements can be edited"
    );
  }

  /*
   * Determine the final values after applying the update.
   * This is important because updateRequirementSchema is partial.
   */
  const categoryId =
    data.categoryId ?? requirement.categoryId;

  const subCategoryId =
    data.subCategoryId ?? requirement.subCategoryId;

  const assignmentMode =
    data.assignmentMode ??
    requirement.assignmentMode;

  const preferredWorkerProfileId =
    data.preferredWorkerProfileId !== undefined
      ? data.preferredWorkerProfileId
      : requirement.preferredWorkerProfileId;

  /* Validate category */
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  /* Validate sub-category belongs to category */
  const subCategory =
    await prisma.subCategory.findFirst({
      where: {
        id: subCategoryId,
        categoryId,
      },
    });

  if (!subCategory) {
    throw new Error(
      "Sub-category does not belong to the selected category"
    );
  }

  /* Preferred Single must have a worker */
  if (
    assignmentMode === "PREFERRED_SINGLE" &&
    !preferredWorkerProfileId
  ) {
    throw new Error(
      "Preferred worker is required for preferred single assignment"
    );
  }

  /*
   * If a preferred worker exists, make sure the worker
   * is still valid for the selected work type.
   */
  if (preferredWorkerProfileId) {
    await validatePreferredWorker(
      preferredWorkerProfileId,
      subCategoryId
    );
  }

  /*
   * If the assignment mode is changed away from
   * PREFERRED_SINGLE and the caller did not explicitly
   * provide a worker, remove the old preferred worker.
   */
  const finalPreferredWorker =
    assignmentMode === "PREFERRED_SINGLE"
      ? preferredWorkerProfileId
      : data.preferredWorkerProfileId !== undefined
        ? data.preferredWorkerProfileId
        : null;

  const updateData: any = {
    categoryId,
    subCategoryId,

    ...(data.city !== undefined && {
      city: data.city,
    }),

    ...(data.state !== undefined && {
      state: data.state,
    }),

    ...(data.address !== undefined && {
      address: data.address,
    }),

    ...(data.shiftTiming !== undefined && {
      shiftTiming: data.shiftTiming,
    }),

    ...(data.salaryBudget !== undefined && {
      salaryBudget: data.salaryBudget,
    }),

    ...(data.minExperience !== undefined && {
      minExperience: data.minExperience,
    }),

    ...(data.joiningDate !== undefined && {
      joiningDate: new Date(data.joiningDate),
    }),

    ...(data.requiredWorkerCount !== undefined && {
      requiredWorkerCount: data.requiredWorkerCount,
    }),

    ...(data.employmentTypes !== undefined && {
      employmentTypes: data.employmentTypes,
    }),

    ...(data.workMode !== undefined && {
      workMode: data.workMode,
    }),

    ...(data.workGeography !== undefined && {
      workGeography: data.workGeography,
    }),

    ...(data.preferredCountries !== undefined && {
      preferredCountries: data.preferredCountries,
    }),

    assignmentMode,

    ...(data.backupPoolSize !== undefined && {
      backupPoolSize: data.backupPoolSize,
    }),

    preferredWorkerProfileId:
      finalPreferredWorker,
  };

  return prisma.requirement.update({
    where: {
      id: requirementId,
    },

    data: updateData,

    include: {
      category: true,
      subCategory: true,
    },
  });
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Open Requirement                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export const openRequirement = async (
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

  if (requirement.status !== "DRAFT") {
    throw new Error(
      "Only draft requirements can be opened"
    );
  }

  /*
   * Final preferred-worker validation before matching.
   * This protects against data becoming invalid between
   * requirement creation/edit and opening.
   */
  if (
    requirement.assignmentMode === "PREFERRED_SINGLE"
  ) {
    if (!requirement.preferredWorkerProfileId) {
      throw new Error(
        "Preferred worker is required for preferred single assignment"
      );
    }

    await validatePreferredWorker(
      requirement.preferredWorkerProfileId,
      requirement.subCategoryId
    );
  }

  // First mark requirement as OPEN.
  await prisma.requirement.update({
    where: {
      id: requirementId,
    },

    data: {
      status: "OPEN",
      openedAt: new Date(),
    },
  });

  // Generate initial matching candidates.
  await generateRequirementMatches(
  requirementId,
  userId
);

  // Return complete requirement + candidates.
  return prisma.requirement.findUnique({
    where: {
      id: requirementId,
    },

    include: requirementInclude,
  });
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Cancel Requirement                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export const cancelRequirement = async (
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
    requirement.status === "FILLED" ||
    requirement.status === "COMPLETED" ||
    requirement.status === "CANCELLED"
  ) {
    throw new Error(
      "Requirement can no longer be cancelled"
    );
  }

  return prisma.requirement.update({
    where: {
      id: requirementId,
    },

    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },

    include: {
      category: true,
      subCategory: true,
    },
  });
};