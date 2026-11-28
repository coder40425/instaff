import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import CustomerLayout from '../../layouts/CustomerLayout';
import PartnerLayout from '../../layouts/PartnerLayout';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { categoryService, requirementService } from '../../services/api';
import type {
  BusinessModel,
  Category,
  SubCategory,
  CreateRequirementPayload,
  EmploymentType,
  WorkMode,
  WorkGeography,
  ShiftTiming,
  Worker,
} from '../../types';
import { BriefcaseBusiness, ClipboardList, MapPin, Calendar, Users, IndianRupee } from 'lucide-react';

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'TEMPORARY', label: 'Temporary' },
];

const BULK_EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'PERMANENT', label: 'Bulk Permanent' },
  { value: 'CONTRACT', label: 'Bulk Contract' },
  { value: 'TEMPORARY', label: 'Bulk Temporary' },
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
  shiftTiming?: ShiftTiming;
  salaryBudget?: number;
  minExperience?: number;
  joiningDate: string;
  requiredWorkerCount?: number;
  employmentTypes?: EmploymentType[];
  workMode?: WorkMode;
  workGeography?: WorkGeography;
  preferredCountries?: string[];
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
  const { user } = useAuth();
  const isPartner = user?.role === 'PARTNER';
  const PageLayout = isPartner ? PartnerLayout : CustomerLayout;
  const [selectedModel, setSelectedModel] = useState<BusinessModel | null>(null);
  const [isReviewingBulk, setIsReviewingBulk] = useState(false);
  const [bulkReviewPayload, setBulkReviewPayload] = useState<CreateRequirementPayload | null>(null);
  const isBulkManpower = selectedModel === 'BULK_MANPOWER';
  // Optional: customer may arrive here from a worker's profile with a
  // preferred worker already chosen (mirrors CreateBookingPage's pattern).
  const preferredWorker: Worker | undefined = location.state?.worker;

  const { register, handleSubmit, control, watch, setValue, setError, clearErrors, reset, formState: { errors } } =
    useForm<RequirementForm>({
      defaultValues: {
        joiningDate: new Date().toISOString().slice(0, 10),
        employmentTypes: [],
        preferredCountries: [],
        backupPoolSize: 2,
        requiredWorkerCount: 1,
      },
    });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['categories', isPartner ? 'all' : 'visible', 'name'],
    queryFn: () => isPartner ? categoryService.getAll('name') : categoryService.getVisible('name'),
  });
  const categories: Category[] = [...(categoriesData ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  const categoryId = watch('categoryId');
  const selectedEmploymentTypes = watch('employmentTypes') ?? [];
  const selectedCountries = watch('preferredCountries') ?? [];
  const workGeography = watch('workGeography');

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategoryOptions: SubCategory[] = [...(selectedCategory?.subCategories ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateRequirementPayload) => requirementService.create(payload),
    onSuccess: (requirement) => {
      toast.success('Requirement created successfully!');
      navigate(`${isPartner ? '/partner' : '/customer'}/requirements/${requirement.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create requirement');
    },
  });

  const onSubmit = (data: RequirementForm) => {
    if (isBulkManpower && (
      !data.employmentTypes ||
      data.employmentTypes.length !== 1 ||
      !BULK_EMPLOYMENT_TYPES.some((type) => type.value === data.employmentTypes?.[0])
    )) {
      setError('employmentTypes', { type: 'validate', message: 'Choose one bulk employment arrangement' });
      return;
    }

    const payload: CreateRequirementPayload = {
      businessModel: isBulkManpower ? 'BULK_MANPOWER' : 'REGULAR_EMPLOYMENT',
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      city: data.city,
      state: data.state || undefined,
      address: data.address || undefined,
      shiftTiming: data.shiftTiming || undefined,
      salaryBudget: data.salaryBudget ? Number(data.salaryBudget) : undefined,
      minExperience: data.minExperience ? Number(data.minExperience) : undefined,
      joiningDate: data.joiningDate,
      requiredWorkerCount: isBulkManpower ? Number(data.requiredWorkerCount) : 1,
      employmentTypes: data.employmentTypes && data.employmentTypes.length > 0 ? data.employmentTypes : undefined,
      workMode: isBulkManpower ? undefined : data.workMode || undefined,
      workGeography: isBulkManpower ? undefined : data.workGeography || undefined,
      preferredCountries: isBulkManpower ? undefined : data.preferredCountries && data.preferredCountries.length > 0 ? data.preferredCountries : undefined,
      assignmentMode: isBulkManpower ? 'BULK_WORKFORCE' : preferredWorker ? 'PREFERRED_SINGLE' : 'SINGLE_WITH_BACKUP',
      backupPoolSize: isBulkManpower ? Number(data.backupPoolSize ?? 0) : preferredWorker ? undefined : Number(data.backupPoolSize),
      preferredWorkerProfileId: isBulkManpower ? undefined : preferredWorker?.id,
    };
    if (isBulkManpower) {
      setBulkReviewPayload(payload);
      setIsReviewingBulk(true);
      return;
    }
    createMutation.mutate(payload);
  };

  if (!selectedModel) {
    const choices: {
      model: BusinessModel;
      title: string;
      subtitle: string;
      description: string;
      available: boolean;
    }[] = [
      {
        model: 'REGULAR_EMPLOYMENT',
        title: 'Regular Employment',
        subtitle: 'Hire Staff',
        description: 'Hire one person for a permanent, contract, temporary, full-time or part-time role.',
        available: true,
      },
      {
        model: 'GIG_WORK',
        title: 'Gig Work',
        subtitle: 'Book a Service',
        description: 'Book a worker for a one-time or recurring service.',
        available: !isPartner,
      },
      {
        model: 'BULK_MANPOWER',
        title: 'Bulk Manpower',
        subtitle: 'Hire a Team',
        description: 'Request multiple workers for a team or workforce need.',
        available: true,
      },
    ];

    return (
      <PageLayout>
        <div className="mx-auto max-w-4xl space-y-6 px-1 sm:px-0">
          <div>
            <p className="text-sm font-medium text-neutral-500">Create a requirement</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">What do you need?</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Choose the type of work so we can use the right workflow.
            </p>
          </div>

          {preferredWorker && (
            <Card className="border-neutral-200 dark:border-neutral-800">
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-neutral-500" />
                <p className="text-sm">Selected worker: <span className="font-semibold">{preferredWorker.user?.name}</span></p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {choices.map((choice) => (
              <button
                key={choice.model}
                type="button"
                disabled={!choice.available}
                onClick={() => {
                  if (choice.model === 'GIG_WORK') {
                    if (preferredWorker) {
                      navigate('/booking/create', { state: { worker: preferredWorker } });
                    } else {
                      navigate('/customer/home');
                    }
                    return;
                  }
                  if (choice.model === 'BULK_MANPOWER') {
                    setValue('requiredWorkerCount', 2);
                    setValue('backupPoolSize', 0);
                    setValue('employmentTypes', []);
                    setValue('workMode', undefined);
                    setValue('workGeography', undefined);
                    setIsReviewingBulk(false);
                    setBulkReviewPayload(null);
                  }
                  setSelectedModel(choice.model);
                }}
                className={`rounded-xl border p-5 text-left transition-colors ${choice.available
                  ? 'border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-300 dark:hover:bg-neutral-900'
                  : 'cursor-not-allowed border-neutral-200 bg-neutral-50/70 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-500'}`}
              >
                <BriefcaseBusiness className="h-6 w-6" />
                <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{choice.title}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{choice.subtitle}</p>
                <p className="mt-2 min-h-12 text-sm text-neutral-600 dark:text-neutral-400">{choice.description}</p>
                <p className="mt-4 text-xs font-medium">{choice.available ? 'Continue' : 'Coming soon'}</p>
              </button>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6 px-1 sm:px-0">
        {isBulkManpower && (
          <Button type="button" variant="ghost" className="-ml-2" onClick={() => {
            setSelectedModel(null);
            setIsReviewingBulk(false);
            setBulkReviewPayload(null);
            reset();
          }}>
            ← Back to business models
          </Button>
        )}
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isBulkManpower ? 'Bulk Manpower – Team Hiring' : 'Regular Employment – Staff Hiring'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm sm:text-base">
              {isBulkManpower
                ? 'Request one group of workers for the same role, work location, shift and employment arrangement.'
                : "Tell us what kind of worker(s) you need — we'll match and assign candidates."}
            </p>
          </div>
        </div>

        {preferredWorker && !isBulkManpower && (
          <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Preferred Worker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-lg">{preferredWorker.user?.name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={isReviewingBulk} className="m-0 min-w-0 space-y-6 border-0 p-0">
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

          <Section title={isBulkManpower ? 'Common Work Location' : 'Location'}>
            {isBulkManpower && <p className="text-sm text-neutral-600 dark:text-neutral-400">All requested workers share this work location.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" /> City <span className="text-red-500">*</span>
                </Label>
                <Input id="city" placeholder="Enter city" {...register('city', {
                  required: 'City is required',
                  ...(isBulkManpower ? { validate: (value) => value.trim().length >= 2 || 'Enter a valid work city' } : {}),
                })} />
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

          <Section title={isBulkManpower ? 'Bulk Work Details' : 'Role Details'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isBulkManpower && (
                <div className="space-y-2">
                  <Label htmlFor="requiredWorkerCount">Total workers required <span className="text-red-500">*</span></Label>
                  <Input
                    id="requiredWorkerCount"
                    type="number"
                    min={2}
                    step={1}
                    {...register('requiredWorkerCount', {
                      valueAsNumber: true,
                      required: 'Enter the total number of workers',
                      min: { value: 2, message: 'Bulk Manpower requires at least two workers' },
                      validate: (value) => Number.isInteger(value) || 'Enter a whole number of workers',
                    })}
                  />
                  {errors.requiredWorkerCount && <p className="text-sm text-red-500">{errors.requiredWorkerCount.message}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="joiningDate" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" /> Joining Date <span className="text-red-500">*</span>
                </Label>
                <Input id="joiningDate" type="date" {...register('joiningDate', { required: 'Joining date is required' })} />
                {errors.joiningDate && <p className="text-sm text-red-500">{errors.joiningDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>{isBulkManpower ? 'Common shift for all workers' : 'Shift Timing'}{isBulkManpower && <span className="text-red-500"> *</span>}</Label>
                <Controller
                  name="shiftTiming"
                  control={control}
                  rules={isBulkManpower ? { required: 'Choose the common shift' } : undefined}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAY">Day</SelectItem>
                        <SelectItem value="NIGHT">Night</SelectItem>
                        <SelectItem value="LIVE_IN_24_HOURS">
                          Live-in / 24 Hours
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.shiftTiming && <p className="text-sm text-red-500">{errors.shiftTiming.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryBudget" className="flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-neutral-500" /> {isBulkManpower ? 'Salary/budget (optional)' : 'Salary Budget (₹/month)'}
                </Label>
                <Input id="salaryBudget" type="number" min={isBulkManpower ? 0.01 : undefined} placeholder="e.g. 15000" {...register('salaryBudget', {
                  valueAsNumber: true,
                  ...(isBulkManpower ? { min: { value: 0.01, message: 'Budget must be positive when provided' } } : {}),
                })} />
                {errors.salaryBudget && <p className="text-sm text-red-500">{errors.salaryBudget.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minExperience">Minimum Experience (years)</Label>
                <Input id="minExperience" type="number" min={isBulkManpower ? 0 : undefined} step={isBulkManpower ? 'any' : undefined} placeholder="e.g. 2" {...register('minExperience', isBulkManpower
                  ? {
                      setValueAs: (value) => value === '' ? undefined : Number(value),
                      min: { value: 0, message: 'Minimum experience cannot be negative' },
                    }
                  : { valueAsNumber: true })} />
                {errors.minExperience && <p className="text-sm text-red-500">{errors.minExperience.message}</p>}
              </div>
              {!isBulkManpower && <div className="space-y-2">
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
              </div>}
              {!isBulkManpower && <div className="space-y-2">
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
              </div>}
            </div>

            {!isBulkManpower && workGeography === 'INTERNATIONAL' && (
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
              <Label>{isBulkManpower ? 'Common employment arrangement' : 'Employment Types'}{isBulkManpower && <span className="text-red-500"> *</span>}</Label>
              {isBulkManpower && <p className="text-sm text-neutral-500">Choose one arrangement for every worker in this group.</p>}
              <div className="flex flex-wrap gap-2">
                {(isBulkManpower ? BULK_EMPLOYMENT_TYPES : EMPLOYMENT_TYPES).map((type) => {
                  const selected = selectedEmploymentTypes.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        const updated = isBulkManpower
                          ? selected ? [] : [type.value]
                          : selected
                            ? selectedEmploymentTypes.filter((t) => t !== type.value)
                            : [...selectedEmploymentTypes, type.value];
                        setValue('employmentTypes', updated);
                        clearErrors('employmentTypes');
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
              {errors.employmentTypes && <p className="text-sm text-red-500">{errors.employmentTypes.message}</p>}
            </div>
          </Section>

          <Section title={isBulkManpower ? 'Matching and backup pool' : 'Candidate matching'}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isBulkManpower
                ? 'We will build a pool for the requested workers plus the backup count. Each worker must accept an offer before they are assigned.'
                : 'This requirement is for one staff member. We’ll match a primary candidate and keep a backup pool available.'}
            </p>
            {(isBulkManpower || !preferredWorker) && (
              <div className="space-y-2">
                <Label htmlFor="backupPoolSize">{isBulkManpower ? 'Backup worker count (optional)' : 'Backup Pool Size'}</Label>
                <Input
                  id="backupPoolSize"
                  type="number"
                  min={0}
                  step={1}
                  {...register('backupPoolSize', isBulkManpower
                    ? {
                        setValueAs: (value) => value === '' ? 0 : Number(value),
                        min: { value: 0, message: 'Backup count cannot be negative' },
                        validate: (value) => Number.isInteger(value) || 'Enter a whole number of backups',
                      }
                    : { valueAsNumber: true })}
                />
                {errors.backupPoolSize && <p className="text-sm text-red-500">{errors.backupPoolSize.message}</p>}
              </div>
            )}
          </Section>

          </fieldset>

          {isBulkManpower && isReviewingBulk && bulkReviewPayload && (
            <Card className="border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <CardHeader className="pb-2"><CardTitle className="text-base">Review Bulk Manpower requirement</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><strong>Role:</strong> {selectedCategory?.name} — {subCategoryOptions.find((item) => item.id === bulkReviewPayload.subCategoryId)?.name}</p>
                <p><strong>Total workers requested:</strong> {bulkReviewPayload.requiredWorkerCount}</p>
                <p><strong>Backup pool size:</strong> {bulkReviewPayload.backupPoolSize ?? 0}</p>
                <p><strong>Employment arrangement:</strong> {BULK_EMPLOYMENT_TYPES.find((type) => type.value === bulkReviewPayload.employmentTypes?.[0])?.label}</p>
                <p><strong>Common location:</strong> {bulkReviewPayload.address ? `${bulkReviewPayload.address}, ` : ''}{bulkReviewPayload.city}{bulkReviewPayload.state ? `, ${bulkReviewPayload.state}` : ''}</p>
                <p><strong>Common shift:</strong> {bulkReviewPayload.shiftTiming?.replace(/_/g, ' ')}</p>
                <p><strong>Joining date:</strong> {bulkReviewPayload.joiningDate}</p>
                <p><strong>Salary/budget:</strong> {bulkReviewPayload.salaryBudget ? `₹${bulkReviewPayload.salaryBudget.toLocaleString('en-IN')}` : 'Not specified'}</p>
                <p><strong>Minimum experience:</strong> {bulkReviewPayload.minExperience ?? 0} years</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            {isBulkManpower && isReviewingBulk ? (
              <>
                <Button type="button" variant="outline" className="flex-1" onClick={() => {
                  setIsReviewingBulk(false);
                  setBulkReviewPayload(null);
                }}>Edit details</Button>
                <Button type="button" className="flex-1" disabled={createMutation.isPending} onClick={() => {
                  if (bulkReviewPayload) createMutation.mutate(bulkReviewPayload);
                }}>
                  {createMutation.isPending ? 'Creating…' : 'Confirm and create requirement'}
                </Button>
              </>
            ) : (
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {isBulkManpower ? 'Review requirement' : createMutation.isPending ? 'Creating…' : 'Create Requirement'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
