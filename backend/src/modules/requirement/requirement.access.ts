import prisma from "../../config/prisma";

export type RequirementActor = {
  role: "CUSTOMER" | "EMPLOYER" | "PARTNER";
  partnerId: string | null;
};

export const getRequirementActor = async (
  userId: string
): Promise<RequirementActor> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      partnerProfile: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (user.role === "PARTNER") {
    if (user.partnerProfile?.status !== "APPROVED") {
      throw new Error("Partner account is not approved");
    }

    return {
      role: "PARTNER",
      partnerId: user.partnerProfile.id,
    };
  }

  if (user.role === "CUSTOMER" || user.role === "EMPLOYER") {
    return {
      role: user.role,
      partnerId: null,
    };
  }

  throw new Error("Unauthorized");
};

export const assertRequirementOwner = async (
  userId: string,
  requirement: { createdById: string },
  isAdmin = false
) => {
  if (isAdmin) return;

  await getRequirementActor(userId);

  if (requirement.createdById !== userId) {
    throw new Error("Unauthorized");
  }
};
