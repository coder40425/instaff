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
  user:   { select: { id: true, name: true, phone: true, role: true } },
  skills: { include: { subCategory: { include: { category: true } } } },
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