import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import WorkerLayout from "../../layouts/WorkerLayout";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";

import { useAuth } from "../../hooks/useAuth";

import {
  profileService,
  categoryService,
  workerService,
  type UpdateWorkerProfilePayload,
} from "../../services/api";

import type {
  EducationLevel,
  MaritalStatus,
  Category,
} from "../../types";

import {
  ChevronDown,
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Star,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const LANGUAGE_OPTIONS = [
  "Hindi",
  "English",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Urdu",
  "Assamese",
].sort((a, b) => a.localeCompare(b));

const EMPLOYMENT_TYPES = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "CONTRACT", label: "Contract" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "PROJECT_BASED", label: "Project Based" },
  { value: "PART_TIME", label: "Part-Time" },
  { value: "FULL_TIME", label: "Full-Time" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "ON_CALL", label: "On-Call" },
  { value: "INTERNSHIP", label: "Internship" },
];

const COUNTRY_OPTIONS = [
  "Australia",
  "Canada",
  "Germany",
  "Japan",
  "Singapore",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Other",
];

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface WorkerProfileForm {
  aadhaarNumber?: string;
  profilePhotoUrl?: string;

  gender?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;

  languagesKnown?: string[];

  education?: EducationLevel;
  maritalStatus?: MaritalStatus;

  skillIds?: string[];

  experience?: number;
  expectedSalary?: number;

  employmentTypes?: string[];

  workMode?: string;
  workGeography?: string;
  preferredCountries?: string[];

  aboutYourself?: string;
  previousCompanies?: string;
  certifications?: string;
  availableTimings?: string;

  preferredWorkingRadius?: number;
  canRelocate?: boolean;

  fatherName?: string;
  motherName?: string;
  emergencyContact?: string;
  emergencyContactNumber?: string;
}

interface WorkerLocation {
  id: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  isPrimary?: boolean;
}

interface LocationForm {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getApiErrorMessage(
  error: any,
  fallback: string
): string {
  const rawMessage =
    error?.response?.data?.message ??
    error?.message;

  if (!rawMessage) {
    return fallback;
  }

  if (typeof rawMessage !== "string") {
    return fallback;
  }

  /*
   * Backend Zod currently sometimes sends:
   * "[{\"origin\":\"array\",...}]"
   *
   * Convert that into a normal user-facing message.
   */
  try {
    const parsed = JSON.parse(rawMessage);

    if (Array.isArray(parsed)) {
      const messages = parsed
        .map((item: any) => item?.message)
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
  } catch {
    // Normal string message. Nothing to parse.
  }

  return rawMessage;
}

/* -------------------------------------------------------------------------- */
/* Section                                                                    */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function WorkerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  /* ----------------------------- Skill picker ---------------------------- */

  const [openCategoryId, setOpenCategoryId] =
    useState<string | null>(null);

  /* ----------------------------- Locations ------------------------------- */

  const [showAddLocation, setShowAddLocation] =
    useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [gettingLocation, setGettingLocation] =
    useState(false);

  const [locationForm, setLocationForm] =
    useState<LocationForm>({
      city: "",
      state: "",
      latitude: 0,
      longitude: 0,
    });

  /* ------------------------------------------------------------------------ */
  /* Profile form                                                             */
  /* ------------------------------------------------------------------------ */

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
  } = useForm<WorkerProfileForm>({
    defaultValues: {
      languagesKnown: [],
      skillIds: [],
      employmentTypes: [],
      preferredCountries: [],
      canRelocate: false,
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Profile query                                                            */
  /* ------------------------------------------------------------------------ */

  const {
    data: existingProfile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ["worker-profile"],
    queryFn: profileService.getWorkerProfile,
    retry: false,
  });

  /* ------------------------------------------------------------------------ */
  /* Categories                                                               */
  /* ------------------------------------------------------------------------ */

  const { data: categoriesData } =
    useQuery<Category[]>({
      queryKey: ["categories", "name"],
      queryFn: () => categoryService.getAll("name"),
    });

  /*
   * Always enforce A-Z on the frontend.
   *
   * This is specifically for worker profile skill selection.
   */
  const categories = useMemo(() => {
    return [...(categoriesData ?? [])]
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      .map((category) => ({
        ...category,
        subCategories: [
          ...(category.subCategories ?? []),
        ].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
  }, [categoriesData]);

  /* ------------------------------------------------------------------------ */
  /* Locations query                                                          */
  /* ------------------------------------------------------------------------ */

  const {
    data: locationsData,
    isLoading: locationsLoading,
  } = useQuery<WorkerLocation[]>({
    queryKey: ["worker-locations"],
    queryFn: workerService.getLocations,
    retry: false,
  });

  const locations = locationsData ?? [];

  /* ------------------------------------------------------------------------ */
  /* Populate profile                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!existingProfile) {
      return;
    }

    const existingSkillIds =
      existingProfile.skills?.map(
        (skill: any) => skill.subCategoryId
      ) ?? [];

    reset({
      aadhaarNumber:
        existingProfile.aadhaarNumber ?? "",

      profilePhotoUrl:
        existingProfile.profilePhotoUrl ?? "",

      gender:
        existingProfile.gender ?? undefined,

      dateOfBirth: existingProfile.dateOfBirth
        ? new Date(existingProfile.dateOfBirth)
            .toISOString()
            .split("T")[0]
        : "",

      height:
        existingProfile.height ?? undefined,

      weight:
        existingProfile.weight ?? undefined,

      languagesKnown:
        existingProfile.languagesKnown ?? [],

      education:
        existingProfile.education ?? undefined,

      maritalStatus:
        existingProfile.maritalStatus ?? undefined,

      skillIds: existingSkillIds,

      experience:
        existingProfile.experience ?? undefined,

      expectedSalary:
        existingProfile.expectedSalary ?? undefined,

      employmentTypes:
        existingProfile.employmentTypes ?? [],

      workMode:
        existingProfile.workMode ?? undefined,

      workGeography:
        existingProfile.workGeography ?? undefined,

      preferredCountries:
        existingProfile.preferredCountries ?? [],

      aboutYourself:
        existingProfile.aboutYourself ?? "",

      previousCompanies:
        existingProfile.previousCompanies ?? "",

      certifications:
        existingProfile.certifications ?? "",

      availableTimings:
        existingProfile.availableTimings ?? "",

      preferredWorkingRadius:
        existingProfile.preferredWorkingRadius ??
        undefined,

      canRelocate:
        existingProfile.canRelocate ?? false,

      fatherName:
        existingProfile.fatherName ?? "",

      motherName:
        existingProfile.motherName ?? "",

      emergencyContact:
        existingProfile.emergencyContact ?? "",

      emergencyContactNumber:
        existingProfile.emergencyContactNumber ?? "",
    });
  }, [existingProfile, reset]);

  /* ------------------------------------------------------------------------ */
  /* Watched values                                                           */
  /* ------------------------------------------------------------------------ */

  const selectedLanguages =
    watch("languagesKnown") ?? [];

  const selectedSkillIds =
    watch("skillIds") ?? [];

  const selectedEmploymentTypes =
    watch("employmentTypes") ?? [];

  const selectedCountries =
    watch("preferredCountries") ?? [];

  const selectedWorkGeography =
    watch("workGeography");

  /* ------------------------------------------------------------------------ */
  /* Toggle helpers                                                           */
  /* ------------------------------------------------------------------------ */

  const toggleLanguage = (language: string) => {
    const updated = selectedLanguages.includes(
      language
    )
      ? selectedLanguages.filter(
          (item) => item !== language
        )
      : [...selectedLanguages, language];

    setValue("languagesKnown", updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const toggleSkill = (skillId: string) => {
    const updated = selectedSkillIds.includes(
      skillId
    )
      ? selectedSkillIds.filter(
          (id) => id !== skillId
        )
      : [...selectedSkillIds, skillId];

    setValue("skillIds", updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const toggleEmploymentType = (
    value: string
  ) => {
    const updated =
      selectedEmploymentTypes.includes(value)
        ? selectedEmploymentTypes.filter(
            (item) => item !== value
          )
        : [
            ...selectedEmploymentTypes,
            value,
          ];

    setValue("employmentTypes", updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const toggleCountry = (country: string) => {
    const updated = selectedCountries.includes(
      country
    )
      ? selectedCountries.filter(
          (item) => item !== country
        )
      : [...selectedCountries, country];

    setValue("preferredCountries", updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Profile submit                                                           */
  /* ------------------------------------------------------------------------ */

  const onSubmit = async (
    data: WorkerProfileForm
  ) => {
    /*
     * Validate required business fields BEFORE
     * calling the backend.
     */

    if (
      !data.skillIds ||
      data.skillIds.length === 0
    ) {
      toast.error(
        "Please select at least one skill."
      );
      return;
    }

    if (
      !data.employmentTypes ||
      data.employmentTypes.length === 0
    ) {
      toast.error(
        "Please select at least one employment type."
      );
      return;
    }

    if (
      data.workGeography === "INTERNATIONAL" &&
      (!data.preferredCountries ||
        data.preferredCountries.length === 0)
    ) {
      toast.error(
        "Please select at least one preferred country."
      );
      return;
    }

    try {
      setLoading(true);

      const payload: UpdateWorkerProfilePayload = {
        ...data,

        height:
          data.height !== undefined &&
          !Number.isNaN(data.height)
            ? Number(data.height)
            : undefined,

        weight:
          data.weight !== undefined &&
          !Number.isNaN(data.weight)
            ? Number(data.weight)
            : undefined,

        experience:
          data.experience !== undefined &&
          !Number.isNaN(data.experience)
            ? Number(data.experience)
            : undefined,

        expectedSalary:
          data.expectedSalary !== undefined &&
          !Number.isNaN(data.expectedSalary)
            ? Number(data.expectedSalary)
            : undefined,

        preferredWorkingRadius:
          data.preferredWorkingRadius !==
            undefined &&
          !Number.isNaN(
            data.preferredWorkingRadius
          )
            ? Number(
                data.preferredWorkingRadius
              )
            : undefined,

        profilePhotoUrl:
          data.profilePhotoUrl || undefined,

        aboutYourself:
          data.aboutYourself || undefined,

        previousCompanies:
          data.previousCompanies || undefined,

        certifications:
          data.certifications || undefined,

        availableTimings:
          data.availableTimings || undefined,

        fatherName:
          data.fatherName || undefined,

        motherName:
          data.motherName || undefined,

        emergencyContact:
          data.emergencyContact || undefined,

        emergencyContactNumber:
          data.emergencyContactNumber ||
          undefined,

        dateOfBirth:
          data.dateOfBirth || undefined,

        employmentTypes:
          data.employmentTypes,

        workMode:
          data.workMode || undefined,

        workGeography:
          data.workGeography || undefined,

        preferredCountries:
          data.workGeography === "DOMESTIC"
            ? []
            : data.preferredCountries ?? [],
      };

      await profileService.updateWorker(
        payload
      );

      await queryClient.invalidateQueries({
        queryKey: ["worker-profile"],
      });

      toast.success(
        "Profile updated successfully!"
      );
    } catch (error: any) {
      console.error(
        "Profile update error:",
        error
      );

      toast.error(
        getApiErrorMessage(
          error,
          "Failed to update profile."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Location helpers                                                         */
  /* ------------------------------------------------------------------------ */

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm((previous) => ({
          ...previous,
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        }));

        toast.success(
          "Current coordinates retrieved."
        );

        setGettingLocation(false);
      },
      (error) => {
        console.error(
          "Geolocation error:",
          error
        );

        toast.error(
          "Unable to get your current location. Please allow location access."
        );

        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const addLocation = async () => {
    if (!locationForm.city.trim()) {
      toast.error("City is required.");
      return;
    }

    if (!locationForm.state.trim()) {
      toast.error("State is required.");
      return;
    }

    if (
      !Number.isFinite(locationForm.latitude) ||
      !Number.isFinite(locationForm.longitude)
    ) {
      toast.error(
        "Please provide valid latitude and longitude."
      );
      return;
    }

    try {
      setLocationLoading(true);

      await workerService.addLocation({
        city: locationForm.city.trim(),
        state: locationForm.state.trim(),
        latitude: Number(
          locationForm.latitude
        ),
        longitude: Number(
          locationForm.longitude
        ),
      });

      toast.success(
        "Location added successfully."
      );

      setLocationForm({
        city: "",
        state: "",
        latitude: 0,
        longitude: 0,
      });

      setShowAddLocation(false);

      await queryClient.invalidateQueries({
        queryKey: ["worker-locations"],
      });
    } catch (error: any) {
      console.error(
        "Add location error:",
        error
      );

      toast.error(
        getApiErrorMessage(
          error,
          "Failed to add location."
        )
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const deleteLocation = async (
    locationId: string
  ) => {
    try {
      setLocationLoading(true);

      await workerService.deleteLocation(
        locationId
      );

      toast.success(
        "Location removed successfully."
      );

      await queryClient.invalidateQueries({
        queryKey: ["worker-locations"],
      });
    } catch (error: any) {
      console.error(
        "Delete location error:",
        error
      );

      toast.error(
        getApiErrorMessage(
          error,
          "Failed to remove location."
        )
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const setPrimaryLocation = async (
    locationId: string
  ) => {
    try {
      setLocationLoading(true);

      await workerService.setPrimaryLocation(
        locationId
      );

      toast.success(
        "Primary location updated."
      );

      await queryClient.invalidateQueries({
        queryKey: ["worker-locations"],
      });
    } catch (error: any) {
      console.error(
        "Set primary location error:",
        error
      );

      toast.error(
        getApiErrorMessage(
          error,
          "Failed to set primary location."
        )
      );
    } finally {
      setLocationLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Derived location                                                         */
  /* ------------------------------------------------------------------------ */

  const hasPrimaryLocation =
    locations.some(
      (location) => location.isPrimary
    );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <WorkerLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            My Profile
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage your professional information
          </p>
        </div>

        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center gap-3">
              <CardTitle>
                Account Information
              </CardTitle>

              <Badge
                variant="secondary"
                className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
              >
                {existingProfile?.isVerified
                  ? "Verified"
                  : "Verification Pending"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={user?.name ?? ""}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={user?.phone ?? ""}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={user?.role ?? ""}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile missing */}
        {!existingProfile &&
          !profileLoading &&
          !profileError && (
            <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Complete your worker profile
                </p>

                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Add your skills, professional
                  information and at least one
                  employment type.
                </p>
              </CardContent>
            </Card>
          )}

        {/* Loading */}
        {profileLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              Loading profile…
            </CardContent>
          </Card>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >

            {/* ---------------------------------------------------------------- */}
            {/* Documents                                                       */}
            {/* ---------------------------------------------------------------- */}

            <Section title="Documents">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label htmlFor="aadhaarNumber">
                    Aadhaar Number{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </Label>

                  <Input
                    id="aadhaarNumber"
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    {...register(
                      "aadhaarNumber"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profilePhotoUrl">
                    Profile Photo URL
                  </Label>

                  <Input
                    id="profilePhotoUrl"
                    placeholder="https://…"
                    {...register(
                      "profilePhotoUrl"
                    )}
                  />
                </div>

              </div>
            </Section>

            {/* ---------------------------------------------------------------- */}
            {/* Skills                                                          */}
            {/* ---------------------------------------------------------------- */}

            <Section title="Skills">

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Select the categories and work
                    types you offer.
                  </p>

                  <p className="text-xs text-neutral-400 mt-1">
                    Categories and work types are
                    shown A–Z.
                  </p>
                </div>

                {selectedSkillIds.length > 0 && (
                  <Badge variant="secondary">
                    {selectedSkillIds.length} selected
                  </Badge>
                )}
              </div>

              {categories.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Loading skills…
                </p>
              ) : (
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[450px] overflow-y-auto">

                  {categories.map((category) => {
                    const isOpen =
                      openCategoryId ===
                      category.id;

                    const selectedCount =
                      category.subCategories.filter(
                        (sub) =>
                          selectedSkillIds.includes(
                            sub.id
                          )
                      ).length;

                    return (
                      <div key={category.id}>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenCategoryId(
                              isOpen
                                ? null
                                : category.id
                            )
                          }
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                isOpen
                                  ? ""
                                  : "-rotate-90"
                              }`}
                            />

                            {category.name}
                          </span>

                          {selectedCount > 0 && (
                            <Badge variant="secondary">
                              {selectedCount}
                            </Badge>
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">

                            {category.subCategories.map(
                              (subCategory) => {
                                const selected =
                                  selectedSkillIds.includes(
                                    subCategory.id
                                  );

                                return (
                                  <button
                                    key={
                                      subCategory.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      toggleSkill(
                                        subCategory.id
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                                      selected
                                        ? "bg-white text-black border-white font-semibold"
                                        : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    {selected &&
                                      "✓ "}
                                    {
                                      subCategory.name
                                    }
                                  </button>
                                );
                              }
                            )}

                          </div>
                        )}

                      </div>
                    );
                  })}

                </div>
              )}

              {selectedSkillIds.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-neutral-500 mb-2">
                    Selected skills
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {categories
                      .flatMap(
                        (category) =>
                          category.subCategories
                      )
                      .filter((skill) =>
                        selectedSkillIds.includes(
                          skill.id
                        )
                      )
                      .sort((a, b) =>
                        a.name.localeCompare(
                          b.name
                        )
                      )
                      .map((skill) => (
                        <Badge
                          key={skill.id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            toggleSkill(skill.id)
                          }
                        >
                          {skill.name} ×
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

            </Section>

            {/* ---------------------------------------------------------------- */}
            {/* Personal                                                        */}
            {/* ---------------------------------------------------------------- */}

            <Section title="Personal Information">

              {watch("profilePhotoUrl") && (
                <img
                  src={watch(
                    "profilePhotoUrl"
                  )}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border"
                  onError={(event) => {
                    (
                      event.currentTarget
                    ).style.display = "none";
                  }}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label>Gender</Label>

                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={
                          field.onChange
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="MALE">
                            Male
                          </SelectItem>
                          <SelectItem value="FEMALE">
                            Female
                          </SelectItem>
                          <SelectItem value="OTHER">
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Date of Birth
                  </Label>

                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register(
                      "dateOfBirth"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">
                    Height (cm)
                  </Label>

                  <Input
                    id="height"
                    type="number"
                    {...register("height", {
                      valueAsNumber: true,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">
                    Weight (kg)
                  </Label>

                  <Input
                    id="weight"
                    type="number"
                    {...register("weight", {
                      valueAsNumber: true,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Education</Label>

                  <Controller
                    name="education"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={
                          field.onChange
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select education" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="NO_FORMAL_EDUCATION">
                            No Formal Education
                          </SelectItem>
                          <SelectItem value="PRIMARY">
                            Primary
                          </SelectItem>
                          <SelectItem value="SECONDARY">
                            Secondary
                          </SelectItem>
                          <SelectItem value="HIGHER_SECONDARY">
                            Higher Secondary
                          </SelectItem>
                          <SelectItem value="DIPLOMA">
                            Diploma
                          </SelectItem>
                          <SelectItem value="GRADUATE">
                            Graduate
                          </SelectItem>
                          <SelectItem value="POST_GRADUATE">
                            Post Graduate
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Marital Status</Label>

                  <Controller
                    name="maritalStatus"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={
                          field.onChange
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="SINGLE">
                            Single
                          </SelectItem>
                          <SelectItem value="MARRIED">
                            Married
                          </SelectItem>
                          <SelectItem value="DIVORCED">
                            Divorced
                          </SelectItem>
                          <SelectItem value="WIDOWED">
                            Widowed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

              </div>

              <div className="space-y-2">
                <Label>Languages Known</Label>

                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map(
                    (language) => {
                      const selected =
                        selectedLanguages.includes(
                          language
                        );

                      return (
                        <button
                          key={language}
                          type="button"
                          onClick={() =>
                            toggleLanguage(
                              language
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-sm border ${
                            selected
                              ? "bg-white text-black border-white font-semibold"
                              : "border-neutral-700 text-neutral-400 hover:border-neutral-400"
                          }`}
                        >
                          {selected && "✓ "}
                          {language}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

            </Section>

            {/* ---------------------------------------------------------------- */}
            {/* Professional                                                     */}
            {/* ---------------------------------------------------------------- */}

            <Section title="Professional Details">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label htmlFor="experience">
                    Experience (years){" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </Label>

                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    {...register(
                      "experience",
                      {
                        valueAsNumber: true,
                      }
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">
                    Expected Salary (₹/month){" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </Label>

                  <Input
                    id="expectedSalary"
                    type="number"
                    min="1"
                    {...register(
                      "expectedSalary",
                      {
                        valueAsNumber: true,
                      }
                    )}
                  />
                </div>

                {/* Employment */}
                <div className="sm:col-span-2 space-y-3">

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>
                        Employment Preference{" "}
                        <span className="text-red-500">
                          *
                        </span>
                      </Label>

                      <p className="text-sm text-neutral-500 mt-1">
                        Select all employment types
                        you are open to.
                      </p>
                    </div>

                    {selectedEmploymentTypes.length >
                      0 && (
                      <Badge variant="secondary">
                        {
                          selectedEmploymentTypes.length
                        }{" "}
                        selected
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {EMPLOYMENT_TYPES.map(
                      (type) => {
                        const selected =
                          selectedEmploymentTypes.includes(
                            type.value
                          );

                        return (
                          <button
                            key={type.value}
                            type="button"
                            aria-pressed={
                              selected
                            }
                            onClick={() =>
                              toggleEmploymentType(
                                type.value
                              )
                            }
                            className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                              selected
                                ? "bg-white text-black border-white font-semibold shadow-sm"
                                : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-400 hover:text-white"
                            }`}
                          >
                            {selected &&
                              "✓ "}
                            {type.label}
                          </button>
                        );
                      }
                    )}

                  </div>

                  {selectedEmploymentTypes.length ===
                    0 && (
                    <p className="text-xs text-red-400">
                      Select at least one employment
                      type.
                    </p>
                  )}

                </div>

                {/* Work Mode */}
                <div className="space-y-2">
                  <Label>
                    Work Mode
                  </Label>

                  <Controller
                    name="workMode"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={
                          field.value ?? ""
                        }
                        onValueChange={
                          field.onChange
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not specified" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="ON_SITE">
                            On-site
                          </SelectItem>

                          <SelectItem value="REMOTE">
                            Remote
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Work Geography */}
                <div className="space-y-2">
                  <Label>
                    Work Geography
                  </Label>

                  <Controller
                    name="workGeography"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={
                          field.value ?? ""
                        }
                        onValueChange={(
                          value
                        ) => {
                          field.onChange(
                            value
                          );

                          if (
                            value ===
                            "DOMESTIC"
                          ) {
                            setValue(
                              "preferredCountries",
                              []
                            );
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not specified" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="DOMESTIC">
                            National & Domestic
                          </SelectItem>

                          <SelectItem value="INTERNATIONAL">
                            International
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Countries */}
                {selectedWorkGeography ===
                  "INTERNATIONAL" && (
                  <div className="sm:col-span-2 space-y-3">

                    <Label>
                      Preferred International
                      Countries
                    </Label>

                    <div className="flex flex-wrap gap-2">
                      {COUNTRY_OPTIONS.map(
                        (country) => {
                          const selected =
                            selectedCountries.includes(
                              country
                            );

                          return (
                            <button
                              key={country}
                              type="button"
                              onClick={() =>
                                toggleCountry(
                                  country
                                )
                              }
                              className={`px-3 py-1.5 rounded-full text-sm border ${
                                selected
                                  ? "bg-white text-black border-white font-semibold"
                                  : "border-neutral-700 text-neutral-400 hover:border-neutral-400"
                              }`}
                            >
                              {selected &&
                                "✓ "}
                              {country}
                            </button>
                          );
                        }
                      )}
                    </div>

                    {selectedCountries.length ===
                      0 && (
                      <p className="text-xs text-red-400">
                        Select at least one country.
                      </p>
                    )}

                  </div>
                )}

                {/* Timing */}
                <div className="space-y-2">
                  <Label htmlFor="availableTimings">
                    Available Timings
                  </Label>

                  <Input
                    id="availableTimings"
                    placeholder="e.g. 9am – 6pm, Mon–Sat"
                    {...register(
                      "availableTimings"
                    )}
                  />
                </div>

                {/* Radius */}
                <div className="space-y-2">
                  <Label htmlFor="preferredWorkingRadius">
                    Working Radius (km)
                  </Label>

                  <Input
                    id="preferredWorkingRadius"
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    {...register(
                      "preferredWorkingRadius",
                      {
                        valueAsNumber: true,
                      }
                    )}
                  />
                </div>

              </div>

              <div className="flex items-center gap-3">
                <Controller
                  name="canRelocate"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="canRelocate"
                      checked={
                        !!field.value
                      }
                      onCheckedChange={
                        field.onChange
                      }
                    />
                  )}
                />

                <Label
                  htmlFor="canRelocate"
                  className="cursor-pointer"
                >
                  I am willing to relocate
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aboutYourself">
                  About Yourself
                </Label>

                <Textarea
                  id="aboutYourself"
                  rows={4}
                  placeholder="Describe your skills and work style…"
                  {...register(
                    "aboutYourself"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousCompanies">
                  Previous Companies / Employers
                </Label>

                <Textarea
                  id="previousCompanies"
                  rows={3}
                  placeholder="List previous employers…"
                  {...register(
                    "previousCompanies"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifications">
                  Certifications
                </Label>

                <Textarea
                  id="certifications"
                  rows={3}
                  placeholder="List certifications…"
                  {...register(
                    "certifications"
                  )}
                />
              </div>

            </Section>

            {/* ---------------------------------------------------------------- */}
            {/* Family                                                           */}
            {/* ---------------------------------------------------------------- */}

            <Section title="Family & Emergency Contact">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label htmlFor="fatherName">
                    Father's Name
                  </Label>

                  <Input
                    id="fatherName"
                    {...register(
                      "fatherName"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherName">
                    Mother's Name
                  </Label>

                  <Input
                    id="motherName"
                    {...register(
                      "motherName"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">
                    Emergency Contact Name
                  </Label>

                  <Input
                    id="emergencyContact"
                    {...register(
                      "emergencyContact"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber">
                    Emergency Contact Number
                  </Label>

                  <Input
                    id="emergencyContactNumber"
                    maxLength={10}
                    {...register(
                      "emergencyContactNumber"
                    )}
                  />
                </div>

              </div>

            </Section>

            {/* ---------------------------------------------------------------- */}
            {/* Multiple Locations                                               */}
            {/* ---------------------------------------------------------------- */}

            <Section title="Work Locations">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Add all cities where you are
                    available to work.
                  </p>

                  <p className="text-xs text-neutral-400 mt-1">
                    Your primary location is used
                    as your main location for matching.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setShowAddLocation(
                      (value) => !value
                    )
                  }
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>

              </div>

              {/* Existing locations */}
              {locationsLoading ? (
                <div className="py-6 text-center text-sm text-neutral-500">
                  Loading locations…
                </div>
              ) : locations.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-neutral-500" />

                  <p className="text-sm font-medium">
                    No work locations added
                  </p>

                  <p className="text-xs text-neutral-500 mt-1">
                    Add at least one location where
                    you are available for work.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">

                  {locations.map(
                    (location) => (
                      <div
                        key={location.id}
                        className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">

                          <div className="flex gap-3">

                            <div className="mt-1">
                              <MapPin className="w-5 h-5 text-neutral-500" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">

                                <p className="font-semibold">
                                  {location.city}
                                </p>

                                {location.isPrimary && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Star className="w-3 h-3 mr-1" />
                                    Primary
                                  </Badge>
                                )}

                              </div>

                              <p className="text-sm text-neutral-500">
                                {location.state}
                              </p>

                              <p className="text-xs text-neutral-400 mt-1">
                                {Number(
                                  location.latitude
                                ).toFixed(5)}
                                ,{" "}
                                {Number(
                                  location.longitude
                                ).toFixed(5)}
                              </p>
                            </div>

                          </div>

                          <div className="flex gap-2">

                            {!location.isPrimary && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  locationLoading
                                }
                                onClick={() =>
                                  setPrimaryLocation(
                                    location.id
                                  )
                                }
                              >
                                Set Primary
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={
                                locationLoading
                              }
                              onClick={() =>
                                deleteLocation(
                                  location.id
                                )
                              }
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                          </div>

                        </div>
                      </div>
                    )
                  )}

                </div>
              )}

              {/* Add location */}
              {showAddLocation && (
                <div className="border rounded-lg p-5 space-y-4 bg-neutral-50 dark:bg-neutral-900">

                  <div>
                    <h3 className="font-semibold">
                      Add Work Location
                    </h3>

                    <p className="text-xs text-neutral-500 mt-1">
                      Add a city and its coordinates.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label>
                        City
                      </Label>

                      <Input
                        value={
                          locationForm.city
                        }
                        onChange={(event) =>
                          setLocationForm(
                            (previous) => ({
                              ...previous,
                              city:
                                event.target
                                  .value,
                            })
                          )
                        }
                        placeholder="e.g. Delhi"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        State
                      </Label>

                      <Input
                        value={
                          locationForm.state
                        }
                        onChange={(event) =>
                          setLocationForm(
                            (previous) => ({
                              ...previous,
                              state:
                                event.target
                                  .value,
                            })
                          )
                        }
                        placeholder="e.g. Delhi"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Latitude
                      </Label>

                      <Input
                        type="number"
                        step="any"
                        value={
                          locationForm.latitude ||
                          ""
                        }
                        onChange={(event) =>
                          setLocationForm(
                            (previous) => ({
                              ...previous,
                              latitude:
                                Number(
                                  event.target
                                    .value
                                ),
                            })
                          )
                        }
                        placeholder="e.g. 28.6139"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Longitude
                      </Label>

                      <Input
                        type="number"
                        step="any"
                        value={
                          locationForm.longitude ||
                          ""
                        }
                        onChange={(event) =>
                          setLocationForm(
                            (previous) => ({
                              ...previous,
                              longitude:
                                Number(
                                  event.target
                                    .value
                                ),
                            })
                          )
                        }
                        placeholder="e.g. 77.2090"
                      />
                    </div>

                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={gettingLocation}
                    onClick={
                      getCurrentLocation
                    }
                  >
                    <Navigation className="w-4 h-4 mr-2" />

                    {gettingLocation
                      ? "Getting location…"
                      : "Use Current Location"}
                  </Button>

                  <div className="flex gap-2">

                    <Button
                      type="button"
                      className="flex-1"
                      disabled={
                        locationLoading
                      }
                      onClick={addLocation}
                    >
                      {locationLoading
                        ? "Adding…"
                        : "Add Location"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddLocation(
                          false
                        );

                        setLocationForm({
                          city: "",
                          state: "",
                          latitude: 0,
                          longitude: 0,
                        });
                      }}
                    >
                      Cancel
                    </Button>

                  </div>

                </div>
              )}

              {!hasPrimaryLocation &&
                locations.length > 0 && (
                  <p className="text-xs text-orange-500">
                    You have locations added but
                    no primary location selected.
                  </p>
                )}

            </Section>

            {/* ---------------------------------------------------------------- */}
            {/* Save                                                              */}
            {/* ---------------------------------------------------------------- */}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading
                ? "Saving Profile…"
                : "Save Profile"}
            </Button>

          </form>
        )}

        {/* Verification */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">

            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Verification Status
            </h3>

            <p className="text-sm text-blue-700 dark:text-blue-300">
              {existingProfile?.isVerified
                ? "Your worker profile has been verified."
                : "Your profile will be reviewed by our admin team before you appear in customer worker searches."}
            </p>

          </CardContent>
        </Card>

      </div>
    </WorkerLayout>
  );
}