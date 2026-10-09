import prisma from "../../config/prisma";

// ── Helper: build Prisma-safe update data ─────────────────────────────────────

function mapProfileData(data: any) {
  return {
    ...(data.profilePhotoUrl        !== undefined && { profilePhotoUrl:        data.profilePhotoUrl }),
    ...(data.gender                 !== undefined && { gender:                 data.gender }),
    ...(data.dateOfBirth            !== undefined && { dateOfBirth:            data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
    ...(data.height                 !== undefined && { height:                 data.height }),
    ...(data.weight                 !== undefined && { weight:                 data.weight }),
    ...(data.languagesKnown         !== undefined && { languagesKnown:         data.languagesKnown }),
    ...(data.education              !== undefined && { education:              data.education }),
    ...(data.maritalStatus          !== undefined && { maritalStatus:          data.maritalStatus }),
    ...(data.experience             !== undefined && { experience:             data.experience }),
    ...(data.expectedSalary         !== undefined && { expectedSalary:         data.expectedSalary }),
    ...(data.aboutYourself          !== undefined && { aboutYourself:          data.aboutYourself }),
    ...(data.previousCompanies      !== undefined && { previousCompanies:      data.previousCompanies }),
    ...(data.certifications         !== undefined && { certifications:         data.certifications }),
    ...(data.availableTimings       !== undefined && { availableTimings:       data.availableTimings }),
    ...(data.preferredWorkingRadius !== undefined && { preferredWorkingRadius: data.preferredWorkingRadius }),
    ...(data.canRelocate            !== undefined && { canRelocate:            data.canRelocate }),
    ...(data.fatherName             !== undefined && { fatherName:             data.fatherName }),
    ...(data.motherName             !== undefined && { motherName:             data.motherName }),
    ...(data.emergencyContact       !== undefined && { emergencyContact:       data.emergencyContact }),
    ...(data.emergencyContactNumber !== undefined && { emergencyContactNumber: data.emergencyContactNumber }),
    ...(data.city                   !== undefined && { city:                   data.city }),
    ...(data.state                  !== undefined && { state:                  data.state }),
    ...(data.latitude               !== undefined && { latitude:               data.latitude }),
    ...(data.longitude              !== undefined && { longitude:              data.longitude }),
    ...(data.aadhaarNumber          !== undefined && { aadhaarNumber:          data.aadhaarNumber }),
        ...(data.employmentTypes        !== undefined && { employmentTypes:        data.employmentTypes }),
    ...(data.workMode               !== undefined && { workMode:               data.workMode }),
    ...(data.workGeography          !== undefined && { workGeography:          data.workGeography }),
    ...(data.preferredCountries     !== undefined && { preferredCountries:     data.preferredCountries }),
  };
}

const workerInclude = {
  user: {
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
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

  locations: {
    orderBy: {
      isPrimary: "desc" as const,
    },
  },
} as const;

// ── Profile functions ─────────────────────────────────────────────────────────

export const createWorkerProfile = async (userId: string, data: any) => {
  const existingProfile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (existingProfile) throw new Error("Worker profile already exists");
  if (!data.aadhaarNumber) throw new Error("Aadhaar number is required");
  if (!data.skillIds || data.skillIds.length === 0) throw new Error("At least one skill is required");

  const profile = await prisma.workerProfile.create({
    data: {
      userId,
      aadhaarNumber:  data.aadhaarNumber as string,
      experience:     data.experience    ?? 0,
      expectedSalary: data.expectedSalary ?? 0,
      ...mapProfileData(data),
    },
  });

  await prisma.workerSkill.createMany({
    data: (data.skillIds as string[]).map((subCategoryId: string) => ({
      workerProfileId: profile.id,
      subCategoryId,
    })),
    skipDuplicates: true,
  });

  return prisma.workerProfile.findUnique({ where: { id: profile.id }, include: workerInclude });
};

export const getWorkerProfile = async (userId: string) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId }, include: workerInclude });
  if (!profile) throw new Error("Worker profile not found");
  return profile;
};

export const getWorkerLocations = async (
  userId: string
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!profile) {
    throw new Error("Worker profile not found");
  }

  return prisma.workerLocation.findMany({
    where: {
      workerProfileId: profile.id,
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        city: "asc",
      },
    ],
  });
};

export const addWorkerLocation = async (
  userId: string,
  data: {
    city: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
  }
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!profile) {
    throw new Error("Worker profile not found");
  }

  const existingLocations =
    await prisma.workerLocation.findMany({
      where: {
        workerProfileId: profile.id,
      },
    });

  const alreadyExists = existingLocations.some(
    (location) =>
      location.city.toLowerCase() ===
        data.city.toLowerCase() &&
      (location.state ?? "").toLowerCase() ===
        (data.state ?? "").toLowerCase()
  );

  if (alreadyExists) {
    throw new Error(
      "This worker location already exists"
    );
  }

  const shouldBePrimary =
    data.isPrimary === true ||
    existingLocations.length === 0;

  if (shouldBePrimary) {
    await prisma.workerLocation.updateMany({
      where: {
        workerProfileId: profile.id,
      },
      data: {
        isPrimary: false,
      },
    });
  }

  return prisma.workerLocation.create({
    data: {
      workerProfileId: profile.id,
      city: data.city,
      state: data.state,
      latitude: data.latitude,
      longitude: data.longitude,
      isPrimary: shouldBePrimary,
    },
  });
};

export const deleteWorkerLocation = async (
  userId: string,
  locationId: string
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!profile) {
    throw new Error("Worker profile not found");
  }

  const location =
    await prisma.workerLocation.findFirst({
      where: {
        id: locationId,
        workerProfileId: profile.id,
      },
    });

  if (!location) {
    throw new Error("Location not found");
  }

  if (location.isPrimary) {
    throw new Error(
      "Primary location cannot be deleted. Set another location as primary first."
    );
  }

  return prisma.workerLocation.delete({
    where: {
      id: locationId,
    },
  });
};

export const setPrimaryWorkerLocation = async (
  userId: string,
  locationId: string
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!profile) {
    throw new Error("Worker profile not found");
  }

  const location =
    await prisma.workerLocation.findFirst({
      where: {
        id: locationId,
        workerProfileId: profile.id,
      },
    });

  if (!location) {
    throw new Error("Location not found");
  }

  await prisma.workerLocation.updateMany({
    where: {
      workerProfileId: profile.id,
    },
    data: {
      isPrimary: false,
    },
  });

  return prisma.workerLocation.update({
    where: {
      id: locationId,
    },
    data: {
      isPrimary: true,
    },
  });
};

export const updateWorkerProfile = async (userId: string, data: any) => {
  const existing = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!existing) return createWorkerProfile(userId, data);

  await prisma.workerProfile.update({ where: { userId }, data: mapProfileData(data) });

  if (data.skillIds && data.skillIds.length > 0) {
    await prisma.workerSkill.deleteMany({ where: { workerProfileId: existing.id } });
    await prisma.workerSkill.createMany({
      data: (data.skillIds as string[]).map((subCategoryId: string) => ({
        workerProfileId: existing.id,
        subCategoryId,
      })),
      skipDuplicates: true,
    });
  }

  return prisma.workerProfile.findUnique({ where: { userId }, include: workerInclude });
};

export const updateAvailability = async (userId: string, isAvailable: boolean) => {
  const existing = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!existing) throw new Error("Worker profile not found. Please complete your profile before updating availability.");
  return prisma.workerProfile.update({ where: { userId }, data: { isAvailable } });
};

export const updateLocation = async (userId: string, data: any) => {
  const existing = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!existing) throw new Error("Worker profile not found. Please complete your profile before updating location.");
  return prisma.workerProfile.update({
    where: { userId },
    data:  { latitude: data.latitude, longitude: data.longitude, city: data.city, state: data.state },
  });
};

// ── Wallet function ───────────────────────────────────────────────────────────

export const getWorkerWallet = async (userId: string) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Worker profile not found");

  // Return wallet with recent transactions; create empty wallet if none yet
  let wallet = await prisma.workerWallet.findUnique({
    where: { workerProfileId: profile.id },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      settlements:  { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!wallet) {
    wallet = await prisma.workerWallet.create({
      data: { workerProfileId: profile.id },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        settlements:  { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
  }

  return wallet;
};

// ── Legacy earnings (kept for backward compat) ────────────────────────────────

export const getWorkerEarnings = async (userId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { workerId: userId, status: "COMPLETED" },
  });
  const totalEarnings = bookings.reduce((sum, b) => sum + Number(b.servicePrice || 0), 0);
  return { totalBookings: bookings.length, totalEarnings };
};

const requirementOfferSelect = {
  id: true,
  requirementId: true,
  status: true,
  offeredAt: true,
  createdAt: true,
  requirement: {
    select: {
      id: true,
      city: true,
      state: true,
      shiftTiming: true,
      salaryBudget: true,
      minExperience: true,
      joiningDate: true,
      requiredWorkerCount: true,
      employmentTypes: true,
      workMode: true,
      workGeography: true,
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
} as const;

export const getWorkerRequirementOffers = async (
  userId: string
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) throw new Error("Worker profile not found");

  return prisma.requirementCandidate.findMany({
    where: {
      workerProfileId: profile.id,
      status: "OFFERED",
    },
    select: requirementOfferSelect,
    orderBy: {
      offeredAt: "desc",
    },
  });
};

export const acceptWorkerRequirementOffer = async (
  userId: string,
  candidateId: string
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) throw new Error("Worker profile not found");

  const offer = await prisma.requirementCandidate.findFirst({
    where: {
      id: candidateId,
      workerProfileId: profile.id,
      status: "OFFERED",
    },
    select: {
      id: true,
      requirementId: true,
    },
  });

  if (!offer) throw new Error("Requirement offer not found");

  return prisma.$transaction(async (tx) => {
    // Serialize acceptances for a requirement before counting confirmed workers.
    const lockedRequirement = await tx.requirement.updateMany({
      where: {
        id: offer.requirementId,
        status: { in: ["OPEN", "MATCHING"] },
      },
      data: {
        updatedAt: new Date(),
      },
    });

    if (lockedRequirement.count !== 1) {
      throw new Error("Requirement is no longer available for assignment");
    }

    const [worker, candidate] = await Promise.all([
      tx.workerProfile.findUnique({
        where: { id: profile.id },
        include: {
          skills: true,
          locations: true,
        },
      }),
      tx.requirementCandidate.findFirst({
        where: {
          id: candidateId,
          requirementId: offer.requirementId,
          workerProfileId: profile.id,
          status: "OFFERED",
        },
        include: {
          requirement: true,
        },
      }),
    ]);

    if (!worker || !candidate) {
      throw new Error("Requirement offer is no longer available");
    }

    if (!worker.isVerified) throw new Error("Worker is not verified");
    if (worker.isSuspended) throw new Error("Worker is suspended");
    if (!worker.isAvailable) throw new Error("Worker is currently unavailable");

    if (worker.experience < candidate.requirement.minExperience) {
      throw new Error("Worker does not meet the experience requirement");
    }

    const hasRequiredSkill = worker.skills.some(
      (skill) => skill.subCategoryId === candidate.requirement.subCategoryId
    );
    if (!hasRequiredSkill) {
      throw new Error("Worker no longer offers this work type");
    }

    const city = candidate.requirement.city.toLocaleLowerCase();
    const canWorkInCity =
      worker.city?.toLocaleLowerCase() === city ||
      worker.locations.some(
        (location) => location.city.toLocaleLowerCase() === city
      );
    if (!canWorkInCity) {
      throw new Error("Worker no longer works in the required city");
    }

    const [activeBooking, activeRequirementAssignment] = await Promise.all([
      tx.booking.findFirst({
        where: {
          workerId: userId,
          status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        },
        select: { id: true },
      }),
      tx.requirementCandidate.findFirst({
        where: {
          workerProfileId: worker.id,
          status: "ASSIGNED",
          requirementId: { not: candidate.requirementId },
          requirement: {
            status: { in: ["OPEN", "MATCHING", "FILLED"] },
          },
        },
        select: { id: true },
      }),
    ]);

    if (activeBooking || activeRequirementAssignment) {
      throw new Error("Worker already has an active assignment");
    }

    const assignedCount = await tx.requirementCandidate.count({
      where: {
        requirementId: candidate.requirementId,
        status: "ASSIGNED",
      },
    });

    if (assignedCount >= candidate.requirement.requiredWorkerCount) {
      throw new Error("Required worker count has already been filled");
    }

    const availabilityClaim = await tx.workerProfile.updateMany({
      where: {
        id: worker.id,
        isVerified: true,
        isSuspended: false,
        isAvailable: true,
      },
      data: { isAvailable: false },
    });

    if (availabilityClaim.count !== 1) {
      throw new Error("Worker is currently unavailable");
    }

    const now = new Date();
    const acceptedCandidate = await tx.requirementCandidate.updateMany({
      where: {
        id: candidate.id,
        workerProfileId: worker.id,
        status: "OFFERED",
      },
      data: {
        status: "ASSIGNED",
        acceptedAt: now,
        assignedAt: now,
      },
    });

    if (acceptedCandidate.count !== 1) {
      throw new Error("Requirement offer is no longer available");
    }

    const newStatus =
      assignedCount + 1 >= candidate.requirement.requiredWorkerCount
        ? "FILLED"
        : "MATCHING";

    await tx.requirement.update({
      where: { id: candidate.requirementId },
      data: {
        status: newStatus,
        ...(newStatus === "FILLED" ? { completedAt: now } : {}),
      },
    });

    return tx.requirementCandidate.findUnique({
      where: { id: candidate.id },
      select: {
        id: true,
        requirementId: true,
        workerProfileId: true,
        status: true,
        offeredAt: true,
        acceptedAt: true,
        assignedAt: true,
        requirement: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  });
};

export const rejectWorkerRequirementOffer = async (
  userId: string,
  candidateId: string
) => {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) throw new Error("Worker profile not found");

  const rejected = await prisma.requirementCandidate.updateMany({
    where: {
      id: candidateId,
      workerProfileId: profile.id,
      status: "OFFERED",
    },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });

  if (rejected.count !== 1) {
    throw new Error("Requirement offer not found or already processed");
  }

  return prisma.requirementCandidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      requirementId: true,
      status: true,
      rejectedAt: true,
    },
  });
};
