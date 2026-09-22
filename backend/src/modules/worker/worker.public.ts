export const customerWorkerSelect = {
  id: true,
  userId: true,

  profilePhotoUrl: true,

  // Professional information
  gender: true,
  languagesKnown: true,
  education: true,

  experience: true,
  aboutYourself: true,
  previousCompanies: true,
  certifications: true,
  availableTimings: true,
  preferredWorkingRadius: true,
  canRelocate: true,

  employmentTypes: true,
  workMode: true,
  workGeography: true,
  preferredCountries: true,

  // Service area only
  city: true,
  state: true,

  // Platform
  isVerified: true,
  isAvailable: true,
  rating: true,
  totalReviews: true,

  user: {
    select: {
      id: true,
      name: true,
    },
  },

  skills: {
    select: {
      id: true,
      workerProfileId: true,
      subCategoryId: true,

      subCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              sequence: true,
            },
          },
        },
      },
    },
  },

  locations: {
    select: {
      id: true,
      workerProfileId: true,
      city: true,
      state: true,
      isPrimary: true,

      // NO latitude
      // NO longitude
    },
  },
} as const;