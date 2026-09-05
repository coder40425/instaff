import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import CustomerLayout from '../../layouts/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { categoryService, requirementService } from '../../services/api';
import type {
  Category,
  SubCategory,
  CreateRequirementPayload,
  EmploymentType,
  WorkMode,
  WorkGeography,
  AssignmentMode,
  Worker,
} from '../../types';
import { ClipboardList, MapPin, Calendar, Users, IndianRupee } from 'lucide-react';

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
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
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'United Arab Emirates', 'Singapore', 'Japan', 'Other',
];

interface RequirementForm {
  categoryId: string;
  subCategoryId: string;
  city: string;
  state?: string;
  address?: string;
  shiftTiming?: string;
  salaryBudget?: number;
  minExperience?: number;
  joiningDate: string;
  requiredWorkerCount?: number;
  employmentTypes?: EmploymentType[];
  workMode?: WorkMode;
  workGeography?: WorkGeography;
  preferredCountries?: string[];
  assignmentMode?: AssignmentMode;
  backupPoolSize?: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function CreateRequirementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Optional: customer may arrive here from a worker's profile with a
  // preferred worker already chosen (mirrors CreateBookingPage's pattern).
  const preferredWorker: Worker | undefined = location.state?.worker;

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } =
    useForm<RequirementForm>({
      defaultValues: {
        joiningDate: new Date().toISOString().slice(0, 10),
        employmentTypes: [],
        preferredCountries: [],
        assignmentMode: preferredWorker ? 'PREFERRED_SINGLE' : 'SINGLE_WITH_BACKUP',
        requiredWorkerCount: 1,
        backupPoolSize: 2,
      },
    });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['categories', 'name'],
    queryFn: () => categoryService.getAll('name'),
  });
  const categories: Category[] = [...(categoriesData ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  const categoryId = watch('categoryId');
  const assignmentMode = watch('workGeography');
  const selectedEmploymentTypes = watch('employmentTypes') ?? [];
  const selectedCountries = watch('preferredCountries') ?? [];
  const workGeography = watch('workGeography');
  const currentAssignmentMode = watch('assignmentMode');

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategoryOptions: SubCategory[] = [...(selectedCategory?.subCategories ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateRequirementPayload) => requirementService.create(payload),
    onSuccess: (requirement) => {
      toast.success('Requirement created successfully!');
      navigate(`/customer/requirements/${requirement.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create requirement');
    },
  });

  const onSubmit = (data: RequirementForm) => {
    const payload: CreateRequirementPayload = {
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      city: data.city,
      state: data.state || undefined,
      address: data.address || undefined,
      shiftTiming: data.shiftTiming || undefined,
      salaryBudget: data.salaryBudget ? Number(data.salaryBudget) : undefined,
      minExperience: data.minExperience ? Number(data.minExperience) : undefined,
      joiningDate: data.joiningDate,
      requiredWorkerCount: data.requiredWorkerCount ? Number(data.requiredWorkerCount) : undefined,
      employmentTypes: data.employmentTypes && data.employmentTypes.length > 0 ? data.employmentTypes : undefined,
      workMode: data.workMode || undefined,
      workGeography: data.workGeography || undefined,
      preferredCountries: data.preferredCountries && data.preferredCountries.length > 0 ? data.preferredCountries : undefined,
      assignmentMode: data.assignmentMode || undefined,
      backupPoolSize: data.assignmentMode === 'SINGLE_WITH_BACKUP' ? Number(data.backupPoolSize) : undefined,
      preferredWorkerProfileId:
        data.assignmentMode === 'PREFERRED_SINGLE' ? preferredWorker?.id : undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto space-y-6 px-1 sm:px-0">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Post a Requirement</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm sm:text-base">
              Tell us what kind of worker(s) you need — we'll match and assign candidates.
            </p>
          </div>
        </div>

        {preferredWorker && (
          <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Preferred Worker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-lg">{preferredWorker.user?.name}</p>
                <Badge variant="secondary">₹{preferredWorker.expectedSalary}/mo</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Section title="Role">
            <div className="space-y-2">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: 'Please select a category' }}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => { field.onChange(v); setValue('subCategoryId', ''); }}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Work Type <span className="text-red-500">*</span></Label>
              <Controller
                name="subCategoryId"
                control={control}
                rules={{ required: 'Please select a work type' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!categoryId}>
                    <SelectTrigger><SelectValue placeholder="Select work type" /></SelectTrigger>
                    <SelectContent>
                      {subCategoryOptions.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subCategoryId && <p className="text-sm text-red-500">{errors.subCategoryId.message}</p>}
            </div>
          </Section>

          <Section title="Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" /> City <span className="text-red-500">*</span>
                </Label>
                <Input id="city" placeholder="Enter city" {...register('city', { required: 'City is required' })} />
                {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="Enter state" {...register('state')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" placeholder="Full address (optional)" {...register('address')} />
            </div>
          </Section>

          <Section title="Role Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="joiningDate" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" /> Joining Date <span className="text-red-500">*</span>
                </Label>
                <Input id="joiningDate" type="date" {...register('joiningDate', { required: 'Joining date is required' })} />
                {errors.joiningDate && <p className="text-sm text-red-500">{errors.joiningDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftTiming">Shift Timing</Label>
                <Input id="shiftTiming" placeholder="e.g. 9am – 6pm" {...register('shiftTiming')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryBudget" className="flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-neutral-500" /> Salary Budget (₹/month)
                </Label>
                <Input id="salaryBudget" type="number" placeholder="e.g. 15000" {...register('salaryBudget', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minExperience">Minimum Experience (years)</Label>
                <Input id="minExperience" type="number" placeholder="e.g. 2" {...register('minExperience', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredWorkerCount" className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-500" /> Number of Workers Required
                </Label>
                <Input id="requiredWorkerCount" type="number" min={1} {...register('requiredWorkerCount', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Work Mode</Label>
                <Controller
                  name="workMode"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
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
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v === 'DOMESTIC') setValue('preferredCountries', []);
                      }}
                      value={field.value ?? ''}
                    >
                      <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOMESTIC">Domestic</SelectItem>
                        <SelectItem value="INTERNATIONAL">International</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {workGeography === 'INTERNATIONAL' && (
              <div className="space-y-2">
                <Label>Preferred Countries</Label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_OPTIONS.map((country) => {
                    const selected = selectedCountries.includes(country);
                    return (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          const updated = selected
                            ? selectedCountries.filter((c) => c !== country)
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
              </div>
            )}

            <div className="space-y-2">
              <Label>Employment Types</Label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPES.map((type) => {
                  const selected = selectedEmploymentTypes.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        const updated = selected
                          ? selectedEmploymentTypes.filter((t) => t !== type.value)
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
            </div>
          </Section>

          <Section title="Assignment Mode">
            <div className="space-y-2">
              <Label>How should we assign workers?</Label>
              <Controller
                name="assignmentMode"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREFERRED_SINGLE" disabled={!preferredWorker}>
                        Preferred Worker Only{!preferredWorker ? ' (select a worker first)' : ''}
                      </SelectItem>
                      <SelectItem value="SINGLE_WITH_BACKUP">Single Worker + Backup Pool</SelectItem>
                      <SelectItem value="BULK_WORKFORCE">Bulk Workforce</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {currentAssignmentMode === 'SINGLE_WITH_BACKUP' && (
              <div className="space-y-2">
                <Label htmlFor="backupPoolSize">Backup Pool Size</Label>
                <Input id="backupPoolSize" type="number" min={0} {...register('backupPoolSize', { valueAsNumber: true })} />
              </div>
            )}
          </Section>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Requirement'}
            </Button>
          </div>
        </form>
      </div>
    </CustomerLayout>
  );
}