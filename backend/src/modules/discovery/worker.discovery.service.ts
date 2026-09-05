import prisma from "../../config/prisma";

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
} as const;

export const getWorkers = async (filters: {
  categoryId?: string;
  subCategoryId?: string;
  subCategoryIds?: string[];
  search?: string;
  city?: string;
  isAvailable?: boolean;
  sort?: "sequence" | "name";
}) => {
  const {
    categoryId,
    subCategoryId,
    subCategoryIds,
    search,
    city,
    isAvailable,
    sort = "sequence",
  } = filters;

  const skillConditions: any[] = [];

  if (categoryId) {
    skillConditions.push({
      skills: {
        some: {
          subCategory: {
            categoryId,
          },
        },
      },
    });
  }

  if (subCategoryId) {
    skillConditions.push({
      skills: {
        some: {
          subCategoryId,
        },
      },
    });
  }

  if (subCategoryIds?.length) {
    skillConditions.push({
      skills: {
        some: {
          subCategoryId: {
            in: subCategoryIds,
          },
        },
      },
    });
  }

  const where: any = {
    // PUBLIC DISCOVERY RULES — NEVER OVERRIDE THESE
    isVerified: true,
    isSuspended: false,

    ...(skillConditions.length > 0 && {
      AND: skillConditions,
    }),

    ...(city && {
      city: {
        equals: city,
        mode: "insensitive",
      },
    }),

    ...(isAvailable !== undefined && {
      isAvailable,
    }),
  };

  if (search?.trim()) {
    const keyword = search.trim();

    where.OR = [
      {
        user: {
          name: {
            contains: keyword,
            mode: "insensitive",
          },
        },
      },
      {
        city: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        state: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        skills: {
          some: {
            subCategory: {
              name: {
                contains: keyword,
                mode: "insensitive",
              },
            },
          },
        },
      },
      {
        skills: {
          some: {
            subCategory: {
              category: {
                name: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
    ];
  }

  const workers = await prisma.workerProfile.findMany({
    where,
    include: workerInclude,
  });

  if (sort === "sequence") {
    workers.sort((a, b) => {
      const aSequence =
        a.skills[0]?.subCategory?.category?.sequence ?? 999;

      const bSequence =
        b.skills[0]?.subCategory?.category?.sequence ?? 999;

      if (aSequence !== bSequence) {
        return aSequence - bSequence;
      }

      return (a.user?.name ?? "").localeCompare(
        b.user?.name ?? ""
      );
    });
  }

  if (sort === "name") {
    workers.sort((a, b) =>
      (a.user?.name ?? "").localeCompare(
        b.user?.name ?? ""
      )
    );
  }

  return workers;
};

export const getWorkerById = async (workerId: string) => {
  const worker = await prisma.workerProfile.findFirst({
    where: {
      id: workerId,

      // PUBLIC DISCOVERY RULES
      isVerified: true,
      isSuspended: false,
    },

    include: workerInclude,
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  return worker;
};