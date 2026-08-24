import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import WorkerLayout from '../../layouts/WorkerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { useAuth } from '../../hooks/useAuth';
import { profileService, categoryService, type UpdateWorkerProfilePayload } from '../../services/api';
import type { EducationLevel, MaritalStatus, Category } from '../../types';
import { ChevronDown, Search } from 'lucide-react';

const LANGUAGE_OPTIONS = [
  'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi',
  'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi',
  'Odia', 'Urdu', 'Assamese',
];

const EMPLOYMENT_TYPES = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'PROJECT_BASED', label: 'Project Based' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'ON_CALL', label: 'On-Call' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const COUNTRY_OPTIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'United Arab Emirates',
  'Singapore',
  'Japan',
  'Other',
];

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
  city?: string;
  state?: string;
  employmentTypes?: string[];
workMode?: string;
workGeography?: string;
preferredCountries?: string[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function WorkerProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // ── Skill picker UI state (display only — does not change form data shape) ──
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const { register, handleSubmit, control, reset, watch, setValue } =
    useForm<WorkerProfileForm>({
  defaultValues: {
    languagesKnown: [],
    skillIds: [],
    employmentTypes: [],
    preferredCountries: [],
    canRelocate: false,
  }
});

  const { data: existingProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: profileService.getWorkerProfile,
    retry: false,
    throwOnError: false,
  });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll("sequence"),
  });

  const categories: Category[] = categoriesData ?? [];

  useEffect(() => {
    if (existingProfile) {
      const existingSkillIds = existingProfile.skills?.map((s: any) => s.subCategoryId) ?? [];
      reset({
        aadhaarNumber:          existingProfile.aadhaarNumber ?? '',
        profilePhotoUrl:        existingProfile.profilePhotoUrl ?? '',
        gender:                 existingProfile.gender ?? undefined,
        dateOfBirth:            existingProfile.dateOfBirth
          ? new Date(existingProfile.dateOfBirth).toISOString().split('T')[0] : '',
        height:                 existingProfile.height ?? undefined,
        weight:                 existingProfile.weight ?? undefined,
        languagesKnown:         existingProfile.languagesKnown ?? [],
        education:              existingProfile.education ?? undefined,
        maritalStatus:          existingProfile.maritalStatus ?? undefined,
        skillIds:               existingSkillIds,
        experience:             existingProfile.experience ?? undefined,
        expectedSalary:         existingProfile.expectedSalary ?? undefined,
        employmentTypes: existingProfile.employmentTypes ?? [],
workMode: existingProfile.workMode ?? undefined,
workGeography: existingProfile.workGeography ?? undefined,
preferredCountries: existingProfile.preferredCountries ?? [],
        aboutYourself:          existingProfile.aboutYourself ?? '',
        previousCompanies:      existingProfile.previousCompanies ?? '',
        certifications:         existingProfile.certifications ?? '',
        availableTimings:       existingProfile.availableTimings ?? '',
        preferredWorkingRadius: existingProfile.preferredWorkingRadius ?? undefined,
        canRelocate:            existingProfile.canRelocate ?? false,
        fatherName:             existingProfile.fatherName ?? '',
        motherName:             existingProfile.motherName ?? '',
        emergencyContact:       existingProfile.emergencyContact ?? '',
        emergencyContactNumber: existingProfile.emergencyContactNumber ?? '',
        city:                   existingProfile.city ?? '',
        state:                  existingProfile.state ?? '',
        
      });

      // Auto-expand the first category that already has selected skills, so
      // returning workers immediately see their existing selections.
      const firstCategoryWithSkill = categories.find((cat) =>
        cat.subCategories.some((sub) => existingSkillIds.includes(sub.id))
      );
      if (firstCategoryWithSkill) {
        setOpenCategoryId(firstCategoryWithSkill.id);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [existingProfile, reset]);

  const selectedLanguages = watch('languagesKnown') ?? [];
  const selectedSkillIds  = watch('skillIds') ?? [];
  const selectedEmploymentTypes = watch('employmentTypes') ?? [];
const selectedCountries = watch('preferredCountries') ?? [];
const selectedWorkGeography = watch('workGeography');

  const toggleLanguage = (lang: string) => {
    const updated = selectedLanguages.includes(lang)
      ? selectedLanguages.filter((l) => l !== lang)
      : [...selectedLanguages, lang];
    setValue('languagesKnown', updated);
  };

  const toggleSkill = (subCategoryId: string) => {
    const updated = selectedSkillIds.includes(subCategoryId)
      ? selectedSkillIds.filter((id) => id !== subCategoryId)
      : [...selectedSkillIds, subCategoryId];
    setValue('skillIds', updated);
  };

  const filteredCategories = categoryFilter.trim()
    ? categories.filter((cat) => cat.name.toLowerCase().includes(categoryFilter.trim().toLowerCase()))
    : categories;

  const selectedCountInCategory = (cat: Category) =>
    cat.subCategories.filter((sub) => selectedSkillIds.includes(sub.id)).length;

  const onSubmit = async (data: WorkerProfileForm) => {
    if (!data.skillIds || data.skillIds.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }
    try {
      setLoading(true);
      const payload: UpdateWorkerProfilePayload = {
        ...data,
        height:                 data.height   ? Number(data.height)   : undefined,
        weight:                 data.weight   ? Number(data.weight)   : undefined,
        experience:             data.experience    ? Number(data.experience)    : undefined,
        expectedSalary:         data.expectedSalary ? Number(data.expectedSalary) : undefined,
        preferredWorkingRadius: data.preferredWorkingRadius ? Number(data.preferredWorkingRadius) : undefined,
        profilePhotoUrl:        data.profilePhotoUrl || undefined,
        aboutYourself:          data.aboutYourself   || undefined,
        previousCompanies:      data.previousCompanies || undefined,
        certifications:         data.certifications  || undefined,
        availableTimings:       data.availableTimings || undefined,
        fatherName:             data.fatherName  || undefined,
        motherName:             data.motherName  || undefined,
        emergencyContact:       data.emergencyContact || undefined,
        emergencyContactNumber: data.emergencyContactNumber || undefined,
        dateOfBirth:            data.dateOfBirth || undefined,
        employmentTypes:        data.employmentTypes ?? [],
workMode:               data.workMode || undefined,
workGeography:          data.workGeography || undefined,
preferredCountries:     data.preferredCountries ?? [],
      };
      await profileService.updateWorker(payload);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Manage your professional information</p>
        </div>

        {/* Account info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Account Information</CardTitle>
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                Verification Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={user?.name ?? ''} disabled /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={user?.phone ?? ''} disabled /></div>
              <div className="space-y-2"><Label>Role</Label><Input value={user?.role ?? ''} disabled /></div>
            </div>
          </CardContent>
        </Card>

        {!existingProfile && !profileLoading && (
          <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">⚠ Profile not set up yet</p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Complete and save your profile below before you can update your location or availability.
              </p>
            </CardContent>
          </Card>
        )}

        {profileLoading ? (
          <Card><CardContent className="py-12 text-center">Loading profile…</CardContent></Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* 1. Documents */}
            <Section title="Documents">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhaarNumber">Aadhaar Number <span className="text-red-500">*</span></Label>
                  <Input id="aadhaarNumber" placeholder="12-digit Aadhaar number" maxLength={12} {...register('aadhaarNumber')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePhotoUrl">Profile Photo URL</Label>
                  <Input id="profilePhotoUrl" placeholder="https://…" {...register('profilePhotoUrl')} />
                </div>
              </div>
            </Section>

            {/* 2. Skills — category → work type picker, aligned with the Worker Directory filters */}
            <Section title="Skills">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Select the categories and work types you offer. You can select multiple.
                </p>
                {selectedSkillIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {selectedSkillIds.length} selected
                  </Badge>
                )}
              </div>

              {categories.length === 0 ? (
                <p className="text-sm text-neutral-400">Loading skills…</p>
              ) : (
                <>
                  {/* Category search — helps navigate a long category list */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      placeholder="Search categories..."
                      className="pl-9"
                    />
                  </div>

                  {/* Accordion of categories, each expanding to its work types */}
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[420px] overflow-y-auto">
                    {filteredCategories.length === 0 ? (
                      <p className="text-sm text-neutral-400 text-center py-6">
                        No categories match &quot;{categoryFilter}&quot;
                      </p>
                    ) : (
                      filteredCategories.map((cat) => {
                        const isOpen = openCategoryId === cat.id;
                        const count = selectedCountInCategory(cat);
                        return (
                          <div key={cat.id}>
                            <button
                              type="button"
                              onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                            >
                              <span className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200 min-w-0">
                                <ChevronDown
                                  className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                                />
                                <span className="truncate">{cat.name}</span>
                              </span>
                              {count > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs flex-shrink-0 bg-black dark:bg-white text-white dark:text-black"
                                >
                                  {count}
                                </Badge>
                              )}
                            </button>
                            {isOpen && (
                              <div className="flex flex-wrap gap-2 px-3 pb-3 pt-1">
                                {cat.subCategories.map((sub) => {
                                  const selected = selectedSkillIds.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => toggleSkill(sub.id)}
                                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                                        selected
                                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                          : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-neutral-500'
                                      }`}
                                    >
                                      {sub.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* Selected skills summary, grouped implicitly, removable inline */}
              {selectedSkillIds.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    Selected skills — click to remove:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {categories
                      .flatMap((c) => c.subCategories)
                      .filter((s) => selectedSkillIds.includes(s.id))
                      .map((s) => (
                        <Badge
                          key={s.id}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => toggleSkill(s.id)}
                        >
                          {s.name} ×
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </Section>

            {/* 3. Personal */}
            <Section title="Personal Information">
              {watch('profilePhotoUrl') && (
                <img
                  src={watch('profilePhotoUrl')}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Controller name="gender" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input id="height" type="number" placeholder="e.g. 165" {...register('height', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" placeholder="e.g. 60" {...register('weight', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Education</Label>
                  <Controller name="education" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger><SelectValue placeholder="Select education" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NO_FORMAL_EDUCATION">No Formal Education</SelectItem>
                        <SelectItem value="PRIMARY">Primary</SelectItem>
                        <SelectItem value="SECONDARY">Secondary (10th)</SelectItem>
                        <SelectItem value="HIGHER_SECONDARY">Higher Secondary (12th)</SelectItem>
                        <SelectItem value="DIPLOMA">Diploma</SelectItem>
                        <SelectItem value="GRADUATE">Graduate</SelectItem>
                        <SelectItem value="POST_GRADUATE">Post Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Controller name="maritalStatus" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="MARRIED">Married</SelectItem>
                        <SelectItem value="DIVORCED">Divorced</SelectItem>
                        <SelectItem value="WIDOWED">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Languages Known</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selectedLanguages.includes(lang)
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                          : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-neutral-500'
                      }`}>
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* 4. Professional */}
            <Section title="Professional Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (years) <span className="text-red-500">*</span></Label>
                  <Input id="experience" type="number" placeholder="e.g. 5" {...register('experience', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">Expected Salary (₹/month) <span className="text-red-500">*</span></Label>
                  <Input id="expectedSalary" type="number" placeholder="e.g. 15000" {...register('expectedSalary', { valueAsNumber: true })} />
                </div>
                <div className="space-y-3 sm:col-span-2">
  <Label>Employment Preference</Label>

  <p className="text-sm text-neutral-500 dark:text-neutral-400">
    Select all employment types you are open to.
  </p>

  <div className="flex flex-wrap gap-2">
    {EMPLOYMENT_TYPES.map((type) => {
      const selected = selectedEmploymentTypes.includes(type.value);

      return (
        <button
          key={type.value}
          type="button"
          onClick={() => {
            const updated = selected
              ? selectedEmploymentTypes.filter((item) => item !== type.value)
              : [...selectedEmploymentTypes, type.value];

            setValue('employmentTypes', updated);
          }}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            selected
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
              : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-neutral-500'
          }`}
        >
          {type.label}
        </button>
      );
    })}
  </div>

  {selectedEmploymentTypes.length === 0 && (
    <p className="text-xs text-neutral-400">
      Not specified
    </p>
  )}
</div>

<div className="space-y-2">
  <Label>Work Mode</Label>

  <Controller
    name="workMode"
    control={control}
    render={({ field }) => (
      <Select
        value={field.value ?? ''}
        onValueChange={(value) => field.onChange(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Not specified" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ON_SITE">On-site</SelectItem>
          <SelectItem value="REMOTE">Remote</SelectItem>
        </SelectContent>
      </Select>
    )}
  />
</div>

<div className="space-y-2">
  <Label>Work Geography</Label>

  <Controller
    name="workGeography"
    control={control}
    render={({ field }) => (
      <Select
        value={field.value ?? ''}
        onValueChange={(value) => {
          field.onChange(value);

          if (value === 'DOMESTIC') {
            setValue('preferredCountries', []);
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
{selectedWorkGeography === 'INTERNATIONAL' && (
  <div className="space-y-3 sm:col-span-2">
    <Label>Preferred International Countries</Label>

    <p className="text-sm text-neutral-500 dark:text-neutral-400">
      Select all countries where you are willing to work.
    </p>

    <div className="flex flex-wrap gap-2">
      {COUNTRY_OPTIONS.map((country) => {
        const selected = selectedCountries.includes(country);

        return (
          <button
            key={country}
            type="button"
            onClick={() => {
              const updated = selected
                ? selectedCountries.filter((item) => item !== country)
                : [...selectedCountries, country];

              setValue('preferredCountries', updated);
            }}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selected
                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-neutral-500'
            }`}
          >
            {country}
          </button>
        );
      })}
    </div>

    {selectedCountries.length === 0 && (
      <p className="text-xs text-neutral-400">
        No countries selected
      </p>
    )}
  </div>
)}

                <div className="space-y-2">
                  <Label htmlFor="availableTimings">Available Timings</Label>
                  <Input id="availableTimings" placeholder="e.g. 9am – 6pm, Mon–Sat" {...register('availableTimings')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredWorkingRadius">Working Radius (km)</Label>
                  <Input id="preferredWorkingRadius" type="number" placeholder="e.g. 10" {...register('preferredWorkingRadius', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Controller name="canRelocate" control={control} render={({ field }) => (
                  <Checkbox id="canRelocate" checked={!!field.value} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor="canRelocate" className="cursor-pointer">I am willing to relocate</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aboutYourself">About Yourself</Label>
                <Textarea id="aboutYourself" rows={4} placeholder="Describe your skills and work style…" {...register('aboutYourself')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousCompanies">Previous Companies / Employers</Label>
                <Textarea id="previousCompanies" rows={3} placeholder="List previous employers…" {...register('previousCompanies')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Textarea id="certifications" rows={3} placeholder="List certifications…" {...register('certifications')} />
              </div>
            </Section>

            {/* 5. Family */}
            <Section title="Family &amp; Emergency Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="fatherName">Father's Name</Label><Input id="fatherName" placeholder="Enter father's name" {...register('fatherName')} /></div>
                <div className="space-y-2"><Label htmlFor="motherName">Mother's Name</Label><Input id="motherName" placeholder="Enter mother's name" {...register('motherName')} /></div>
                <div className="space-y-2"><Label htmlFor="emergencyContact">Emergency Contact Name</Label><Input id="emergencyContact" placeholder="Enter name" {...register('emergencyContact')} /></div>
                <div className="space-y-2"><Label htmlFor="emergencyContactNumber">Emergency Contact Number</Label><Input id="emergencyContactNumber" placeholder="10-digit number" maxLength={10} {...register('emergencyContactNumber')} /></div>
              </div>
            </Section>

            {/* 6. Location */}
            <Section title="Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="city">City</Label><Input id="city" placeholder="Enter city" {...register('city')} /></div>
                <div className="space-y-2"><Label htmlFor="state">State</Label><Input id="state" placeholder="Enter state" {...register('state')} /></div>
              </div>
            </Section>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Saving…' : 'Save Profile'}
            </Button>
          </form>
        )}

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Verification Status</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your profile will be verified by our admin team within 24–48 hours.
            </p>
          </CardContent>
        </Card>
      </div>
    </WorkerLayout>
  );
}