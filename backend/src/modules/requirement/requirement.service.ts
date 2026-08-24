import prisma from "../../config/prisma";

export const createRequirement = async (
  userId: string,
  data: any
) => {
  // Verify category
  const category = await prisma.category.findUnique({
    where: {
      id: data.categoryId,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Verify sub-category belongs to selected category
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

  const requirement = await prisma.requirement.create({
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

      // Future-ready defaults.
      // Advanced assignment behaviour will be implemented later.
      assignmentMode: "SINGLE_WITH_BACKUP",
      backupPoolSize: 10,

      status: "OPEN",
      openedAt: new Date(),
    },

    include: {
      category: true,
      subCategory: true,
      candidates: true,
    },
  });

  return requirement;
};

export const getMyRequirements = async (
  userId: string
) => {
  return prisma.requirement.findMany({
    where: {
      createdById: userId,
    },

    include: {
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
          rank: "asc",
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getRequirementById = async (
  requirementId: string,
  userId: string
) => {
  const requirement =
    await prisma.requirement.findUnique({
      where: {
        id: requirementId,
      },

      include: {
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
            rank: "asc",
          },
        },
      },
    });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  if (requirement.createdById !== userId) {
    throw new Error("Unauthorized");
  }

  return requirement;
};

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