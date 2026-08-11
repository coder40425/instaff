import prisma from "../../config/prisma";

export const getAllCategories = async (
  sort: "sequence" | "name" = "sequence"
) => {
  return prisma.category.findMany({
    include: {
      subCategories: {
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy:
      sort === "name"
        ? { name: "asc" }
        : { sequence: "asc" },
  });
};