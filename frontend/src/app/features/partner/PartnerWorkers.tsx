import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, CheckCircle2, MapPin, RefreshCw, Search, SearchX, UserPlus, UserRound, UsersRound, X,
} from 'lucide-react';
import { toast } from 'sonner';
import PartnerLayout from '../../layouts/PartnerLayout';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { categoryService, workerService } from '../../services/api';
import { partnerService } from '../../services/partnerApi';
import type { PublicWorkerProfile, WorkerDirectoryFilters } from '../../types';
import { PartnerStatusBadge, PartnerWorkerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import type { PartnerAssociatedWorker, PartnerWorkerOperationalStatus } from '../../types/partner';

const PAGE_SIZE = 20;
type Tab = 'discovery' | 'workforce';
type RowMode = 'discover' | 'workforce';
type WorkforceStatusFilter = 'all' | 'VERIFICATION_PENDING' | PartnerWorkerOperationalStatus;

// Shared desktop column template so the header and every row line up.
const ROW_GRID = 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5.5rem_minmax(0,1.3fr)_minmax(10rem,1.2fr)_15rem]';
const SELECT_CLASS =
  'h-9 w-full rounded-md border border-neutral-200 bg-background px-2.5 text-sm text-foreground disabled:opacity-50 dark:border-neutral-700';

const unique = (values: (string | undefined)[]) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

const formatLabel = (value: string) =>
  value.split('_').map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');

const locationOf = (worker: { city?: string | null; state?: string | null }) =>
  [worker.city, worker.state].filter(Boolean).join(', ');

const messageOf = (error: unknown) =>
  (error as any)?.response?.data?.message || (error as Error | null)?.message;

export default function PartnerWorkers() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('discovery');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [workforceSearch, setWorkforceSearch] = useState('');
  const [workforceStatus, setWorkforceStatus] = useState<WorkforceStatusFilter>('all');
  const [discoveryShown, setDiscoveryShown] = useState(PAGE_SIZE);
  const [workforceShown, setWorkforceShown] = useState(PAGE_SIZE);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerToRemove, setWorkerToRemove] = useState<PublicWorkerProfile | null>(null);
  const [inviteInfoOpen, setInviteInfoOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Start from the first page whenever the result set changes.
  useEffect(() => { setDiscoveryShown(PAGE_SIZE); }, [search, categoryId, subCategoryId, city, availability]);
  useEffect(() => { setWorkforceShown(PAGE_SIZE); }, [workforceSearch, workforceStatus]);

  const profileQuery = useQuery({ queryKey: ['partner-profile'], queryFn: partnerService.getProfile });
  const approved = profileQuery.data?.status === 'APPROVED';
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'sequence'],
    queryFn: () => categoryService.getAll('sequence'),
    enabled: approved,
  });
  const workersQuery = useQuery({
    queryKey: ['partner-workers'],
    queryFn: partnerService.getWorkers,
    enabled: approved,
  });

  const filters: WorkerDirectoryFilters = {
    sort: 'name',
    ...(search && { search }),
    ...(categoryId && { categoryId }),
    ...(subCategoryId && { subCategoryId }),
    ...(city.trim() && { city: city.trim() }),
    ...(availability !== 'all' && { isAvailable: availability === 'available' }),
  };
  const discoveryQuery = useQuery({
    queryKey: ['partner-worker-discovery', filters],
    queryFn: () => workerService.getAll(filters),
    enabled: approved,
  });
  const detailQuery = useQuery({
    queryKey: ['partner-worker-detail', selectedWorkerId],
    queryFn: () => workerService.getById(selectedWorkerId!),
    enabled: !!selectedWorkerId,
    retry: false,
  });

  const refreshAssociationViews = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['partner-workers'] }),
    queryClient.invalidateQueries({ queryKey: ['partner-profile'] }),
    queryClient.invalidateQueries({ queryKey: ['partner-dashboard-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['partner-worker-discovery'] }),
  ]);
  const addMutation = useMutation({
    mutationFn: (selectedWorker: PublicWorkerProfile) => partnerService.associateWorker(selectedWorker.id),
    onSuccess: async (_result, selectedWorker) => {
      await refreshAssociationViews();
      toast.success((selectedWorker.user?.name || 'Worker') + ' added to your workforce');
    },
    onError: (error: any) => toast.error(messageOf(error) || 'Unable to add this worker'),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => partnerService.removeWorker(id),
    onSuccess: async () => {
      setWorkerToRemove(null);
      await refreshAssociationViews();
      toast.success('Worker removed from your workforce. They can be found in Find Workers again.');
    },
    onError: (error: any) => toast.error(messageOf(error) || 'Unable to remove this worker'),
  });

  // ---- Derived data -------------------------------------------------------
  const categories = categoriesQuery.data ?? [];
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const subCategoriesOf = (id: string) =>
    [...(categories.find((category) => category.id === id)?.subCategories ?? [])].sort(byName);
  const selectedCategoryName = categories.find((category) => category.id === categoryId)?.name;
  const selectedWorkTypeName = categories
    .flatMap((category) => category.subCategories ?? [])
    .find((subCategory) => subCategory.id === subCategoryId)?.name;

  const workerLimit = profileQuery.data?.workerLimit ?? null;
  const workerCount = profileQuery.data?.workerCount ?? 0;
  const limitReached = workerLimit !== null && workerCount >= workerLimit;
  const usage = workerLimit ? Math.min(100, Math.round((workerCount / workerLimit) * 100)) : 0;
  const usageColor = limitReached ? 'bg-red-500' : usage >= 90 ? 'bg-amber-500' : 'bg-primary';

  const associatedWorkers = workersQuery.data ?? [];
  const associatedIds = new Set(associatedWorkers.map((worker) => worker.id));
  const workforceTerm = workforceSearch.trim().toLowerCase();
  const matchingWorkers = associatedWorkers.filter((worker) => {
    const text = [
      worker.user?.name, worker.city, worker.state,
      ...worker.skills.map((skill) => skill.subCategory.name),
      ...worker.skills.map((skill) => skill.subCategory.category?.name),
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !workforceTerm || text.includes(workforceTerm);
    const matchesStatus = workforceStatus === 'all'
      || (workforceStatus === 'VERIFICATION_PENDING' && !worker.isVerified)
      || (workforceStatus !== 'VERIFICATION_PENDING' && worker.operationalStatus === workforceStatus);
    return matchesSearch && matchesStatus;
  });

  // Discovery = verified workers NOT already associated. Category / work type are also
  // matched client-side as a safety net so the dropdowns always narrow the list.
  const discoveryWorkers = (discoveryQuery.data ?? []).filter((worker) => {
    if (associatedIds.has(worker.id)) return false;
    if (selectedWorkTypeName) return worker.skills.some((skill) => skill.subCategory.name === selectedWorkTypeName);
    if (selectedCategoryName) return worker.skills.some((skill) => skill.subCategory.category?.name === selectedCategoryName);
    return true;
  });
  const shownDiscovery = discoveryWorkers.slice(0, discoveryShown);
  const shownWorkforce = matchingWorkers.slice(0, workforceShown);

  const detailWorker = detailQuery.data ?? null;
  const detailAssociatedWorker = detailWorker
    ? associatedWorkers.find((worker) => worker.id === detailWorker.id)
    : undefined;
  const detailCategories = detailWorker ? unique(detailWorker.skills.map((skill) => skill.subCategory.category?.name)) : [];
  const detailWorkTypes = detailWorker ? unique(detailWorker.skills.map((skill) => skill.subCategory.name)) : [];
  const detailAssociated = !!detailWorker && associatedIds.has(detailWorker.id);
  const detailStatus = detailAssociatedWorker
    ? detailAssociatedWorker.operationalStatus
    : detailWorker?.isVerified
      ? detailWorker.isAvailable ? 'AVAILABLE' : 'OFFLINE'
      : null;
  const detailStatusLabel = detailStatus
    ? ({ AVAILABLE: 'Available', BUSY: 'Busy', ON_DUTY: 'On Duty', OFFLINE: 'Offline', SUSPENDED: 'Suspended' } as const)[detailStatus]
    : detailWorker?.isVerified ? 'Status unavailable' : 'Verification pending';
  const hasFilters = !!searchInput.trim() || !!categoryId || !!subCategoryId || !!city.trim() || availability !== 'all';

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setCategoryId(''); setSubCategoryId(''); setCity(''); setAvailability('all');
  };
  const onCategoryChange = (next: string) => {
    setCategoryId(next);
    if (next && subCategoryId && !subCategoriesOf(next).some((subCategory) => subCategory.id === subCategoryId)) {
      setSubCategoryId('');
    }
  };

  // ---- Small render helpers (file-local, not separate components) ----------
  const renderAvatar = (url: string | undefined | null, size: string, icon: string) =>
    url
      ? <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
      : <div className={`${size} flex shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800`}><UserRound className={`${icon} text-neutral-500`} /></div>;

  const renderSkeleton = () => (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800" aria-busy="true" aria-label="Loading workers">
      {[0, 1, 2, 3, 4].map((item) => (
        <li key={item} className="flex animate-pulse items-center gap-3 px-4 py-4">
          <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800" />
          <div className="flex-1 space-y-2"><div className="h-3 w-40 rounded bg-neutral-100 dark:bg-neutral-800" /><div className="h-3 w-64 max-w-full rounded bg-neutral-100 dark:bg-neutral-800" /></div>
        </li>
      ))}
    </ul>
  );

  const renderRow = (worker: PublicWorkerProfile | PartnerAssociatedWorker, mode: RowMode) => {
    const groups = unique(worker.skills.map((skill) => skill.subCategory.category?.name));
    const workTypes = unique(worker.skills.map((skill) => skill.subCategory.name));
    const location = locationOf(worker);
    const adding = addMutation.isPending && addMutation.variables?.id === worker.id;
    const workTypeText = workTypes.slice(0, 2).join(', ') + (workTypes.length > 2 ? ' +' + (workTypes.length - 2) : '');
    return (
      <li key={worker.id} className={'grid gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50 xl:items-center ' + ROW_GRID}>
        <div className="flex min-w-0 items-center gap-3">
          {renderAvatar(worker.profilePhotoUrl, 'h-10 w-10', 'h-4 w-4')}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{worker.user?.name || 'NearPassway worker'}</p>
              {worker.isVerified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" aria-label="Verified" />}
            </div>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400 xl:hidden">{workTypeText || groups[0] || 'No public work type listed'}</p>
          </div>
        </div>

        {/* On mobile these sit in one wrapped meta line; on xl they become real columns. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 xl:contents xl:text-sm">
          <div className="hidden min-w-0 xl:block">
            <p className="truncate font-medium text-foreground">{workTypeText || 'No public work type listed'}</p>
            {groups[0] && <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{groups.join(', ')}</p>}
          </div>
          <span>{worker.experience} {worker.experience === 1 ? 'yr' : 'yrs'}<span className="xl:hidden"> experience</span></span>
          <span className="inline-flex min-w-0 items-center gap-1 xl:truncate">
            {location ? <><MapPin className="h-3 w-3 shrink-0 xl:hidden" /><span className="truncate">{location}</span></> : <span className="text-neutral-400">—</span>}
          </span>
          {mode === 'workforce' ? (
            <span className="flex flex-wrap items-center gap-1.5 xl:justify-center">
              <Badge variant="outline" className={worker.isVerified
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'}>
                {worker.isVerified ? 'Verified' : 'Verification pending'}
              </Badge>
              <PartnerWorkerStatusBadge status={(worker as PartnerAssociatedWorker).operationalStatus} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className={'h-1.5 w-1.5 rounded-full ' + (worker.isAvailable ? 'bg-green-500' : 'bg-neutral-400')} />
              {worker.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          )}
        </div>

        <div className="flex gap-2 xl:justify-end">
          <Button variant="outline" size="sm" className="flex-1 xl:flex-none" onClick={() => setSelectedWorkerId(worker.id)}>View Profile</Button>
          {mode === 'discover' ? (
            <Button size="sm" className="flex-1 xl:flex-none" disabled={limitReached || addMutation.isPending} onClick={() => addMutation.mutate(worker)}>
              {adding ? 'Adding…' : limitReached ? 'Limit reached' : 'Add to workforce'}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 xl:flex-none" onClick={() => setWorkerToRemove(worker)}>Remove</Button>
          )}
        </div>
      </li>
    );
  };

  const renderColumnHeader = () => (
    <div className={'hidden gap-x-4 border-b border-neutral-200 bg-neutral-50/70 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40 xl:grid ' + ROW_GRID}>
      <span>Worker</span><span>Work type</span><span>Experience</span><span>Location</span><span>Status</span><span className="text-right">Actions</span>
    </div>
  );

  const renderShowMore = (shown: number, total: number, onMore: () => void) => (
    <div className="flex flex-col items-center gap-2 border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-800 sm:flex-row sm:justify-between">
      <span>Showing {Math.min(shown, total)} of {total}</span>
      {shown < total && <Button variant="outline" size="sm" onClick={onMore}>Show {Math.min(PAGE_SIZE, total - shown)} more</Button>}
    </div>
  );

  const renderError = (message: string, retry: () => void) => (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
    </div>
  );

  const profileError = messageOf(profileQuery.error);
  const discoveryLoading = discoveryQuery.isLoading || (workersQuery.isLoading && !workersQuery.isError);

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Workers</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Find verified NearPassway workers and manage the ones in your workforce.</p>
          </div>
          {profileQuery.data && approved && (
            <div className="w-full sm:w-56" aria-label="Workforce capacity">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-500">Workforce</span>
                <span><span className="text-xl font-bold tabular-nums">{workerCount}</span><span className="text-neutral-500"> / {workerLimit ?? 'Unlimited'}</span></span>
              </div>
              {workerLimit !== null && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={workerCount} aria-valuemin={0} aria-valuemax={workerLimit}>
                  <div className={'h-full rounded-full transition-all ' + usageColor} style={{ width: usage + '%' }} />
                </div>
              )}
            </div>
          )}
        </header>

        {profileQuery.isLoading ? (
          <Card><CardContent className="py-10 text-center text-sm text-neutral-500">Loading Partner profile…</CardContent></Card>
        ) : profileQuery.isError || !profileQuery.data ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{profileError || 'Unable to load your Partner profile.'}</p>
              <Button variant="outline" onClick={() => profileQuery.refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : !approved ? (
          <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Worker management is unavailable until approval.</p>
                  <PartnerStatusBadge status={profileQuery.data.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">You can check your approval status on your profile.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Primary navigation: one workspace, two clearly separated views */}
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="-mb-px flex" role="tablist" aria-label="Partner workers">
                {([
                  { id: 'discovery', label: 'Find Workers', icon: Search, count: null },
                  { id: 'workforce', label: 'My Workforce', icon: UsersRound, count: workerCount },
                ] as const).map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ' + (tab === id ? 'border-primary text-foreground' : 'border-transparent text-neutral-500 hover:text-foreground')}
                  >
                    <Icon className="h-4 w-4" />{label}
                    {count !== null && <Badge variant="secondary" className="h-5 px-1.5 text-[11px] tabular-nums">{count}</Badge>}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mb-1.5 shrink-0" onClick={() => setInviteInfoOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Invite a new worker</span><span className="sm:hidden">Invite</span>
              </Button>
            </div>

            {tab === 'discovery' ? (
              <section className="space-y-4" aria-label="Find workers">
                <div className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800 sm:p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, work type or city" className="pl-9" autoComplete="off" aria-label="Search workers" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <select aria-label="Category" value={categoryId} onChange={(event) => onCategoryChange(event.target.value)} className={SELECT_CLASS}>
                      <option value="">All categories</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <select aria-label="Work type" value={subCategoryId} onChange={(event) => setSubCategoryId(event.target.value)} className={SELECT_CLASS}>
                      <option value="">All work types</option>
                      {categoryId
                        ? subCategoriesOf(categoryId).map((subCategory) => <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>)
                        : categories.filter((category) => category.subCategories?.length).map((category) => (
                          <optgroup key={category.id} label={category.name}>
                            {subCategoriesOf(category.id).map((subCategory) => <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>)}
                          </optgroup>
                        ))}
                    </select>
                    <Input aria-label="Service location" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Location (city)" className="h-9" />
                    <select aria-label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value as 'all' | 'available' | 'unavailable')} className={SELECT_CLASS}>
                      <option value="all">Any availability</option>
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                  {(hasFilters || categoriesQuery.isError) && (
                    <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                      <span>{categoriesQuery.isError ? 'Category filters are temporarily unavailable.' : ''}</span>
                      {hasFilters && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}><X className="mr-1 h-3 w-3" />Clear filters</Button>}
                    </div>
                  )}
                </div>

                {limitReached && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/20">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                    You have reached your worker limit. Remove a worker to add someone new.
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {discoveryLoading ? renderSkeleton()
                    : discoveryQuery.isError ? renderError(messageOf(discoveryQuery.error) || 'Unable to find workers.', () => discoveryQuery.refetch())
                    : discoveryWorkers.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                        <SearchX className="h-6 w-6 text-neutral-400" />
                        <p className="text-sm font-medium">{hasFilters ? 'No workers match these filters' : 'No more workers to add right now'}</p>
                        <p className="max-w-sm text-xs text-neutral-500">{hasFilters ? 'Try a broader search or clear the filters.' : 'Every verified worker is already in your workforce, or none are available yet.'}</p>
                        <div className="mt-2 flex gap-2">
                          {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
                          <Button variant="ghost" size="sm" onClick={() => setInviteInfoOpen(true)}>Invite a new worker</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {renderColumnHeader()}
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">{shownDiscovery.map((worker) => renderRow(worker, 'discover'))}</ul>
                        {renderShowMore(discoveryShown, discoveryWorkers.length, () => setDiscoveryShown((value) => value + PAGE_SIZE))}
                      </>
                    )}
                </div>
              </section>
            ) : (
              <section className="space-y-4" aria-label="My workforce">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">My Workforce</h2>
                    <p className="text-sm text-neutral-500">{associatedWorkers.length} associated worker{associatedWorkers.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <Input value={workforceSearch} onChange={(event) => setWorkforceSearch(event.target.value)} placeholder="Search your workforce" className="pl-9" aria-label="Search associated workers" />
                    </div>
                    <select
                      aria-label="Filter workforce by status"
                      value={workforceStatus}
                      onChange={(event) => setWorkforceStatus(event.target.value as WorkforceStatusFilter)}
                      className={SELECT_CLASS + ' sm:w-52'}
                    >
                      <option value="all">All statuses</option>
                      <option value="VERIFICATION_PENDING">Verification pending</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="BUSY">Busy</option>
                      <option value="ON_DUTY">On Duty</option>
                      <option value="OFFLINE">Offline</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => workersQuery.refetch()} disabled={workersQuery.isFetching}>
                      <RefreshCw className={'mr-1.5 h-4 w-4 ' + (workersQuery.isFetching ? 'animate-spin' : '')} />Refresh
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {workersQuery.isLoading ? renderSkeleton()
                    : workersQuery.isError ? renderError(messageOf(workersQuery.error) || 'Unable to load your workforce.', () => workersQuery.refetch())
                    : matchingWorkers.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                        <UsersRound className="h-6 w-6 text-neutral-400" />
                        <p className="text-sm font-medium">{associatedWorkers.length ? 'No matching workers' : 'No workers in your workforce yet'}</p>
                        <p className="max-w-sm text-xs text-neutral-500">{associatedWorkers.length ? 'Try a different name, work type or location.' : 'Find verified NearPassway workers and add them to start building your workforce.'}</p>
                        {!associatedWorkers.length && <Button size="sm" className="mt-2" onClick={() => setTab('discovery')}>Find Workers</Button>}
                      </div>
                    ) : (
                      <>
                        {renderColumnHeader()}
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">{shownWorkforce.map((worker) => renderRow(worker, 'workforce'))}</ul>
                        {renderShowMore(workforceShown, matchingWorkers.length, () => setWorkforceShown((value) => value + PAGE_SIZE))}
                      </>
                    )}
                </div>
              </section>
            )}
          </>
        )}

        {/* Professional profile (public fields only: no contact, address, ID, DOB, salary, family info) */}
        <Dialog open={!!selectedWorkerId} onOpenChange={(open) => { if (!open) setSelectedWorkerId(null); }}>
          <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
            <DialogHeader className="sr-only"><DialogTitle>{detailWorker?.user?.name || 'Worker profile'}</DialogTitle><DialogDescription>Public professional information from the NearPassway worker profile.</DialogDescription></DialogHeader>
            {detailQuery.isLoading ? <p className="py-16 text-center text-sm text-neutral-500">Loading worker profile…</p> : detailQuery.isError || !detailWorker ? (
              <p className="py-16 text-center text-sm text-neutral-500">This verified worker profile is no longer available.</p>
            ) : (
              <>
                <div className="flex items-center gap-4 border-b border-neutral-200 p-5 pr-12 dark:border-neutral-800 sm:p-6 sm:pr-14">
                  {renderAvatar(detailWorker.profilePhotoUrl, 'h-16 w-16 sm:h-20 sm:w-20', 'h-7 w-7')}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-xl font-semibold">{detailWorker.user?.name || 'NearPassway worker'}</h2>
                      <Badge variant="outline" className={detailWorker.isVerified
                        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
                        : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'}>
                        {detailWorker.isVerified ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                        {detailWorker.isVerified ? 'Verified' : 'Verification pending'}
                      </Badge>
                      <PartnerWorkerStatusBadge status={detailStatus} />
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      {[detailWorkTypes[0], detailWorker.experience + ' ' + (detailWorker.experience === 1 ? 'year' : 'years') + ' experience'].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
                      {locationOf(detailWorker) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{locationOf(detailWorker)}</span>}
                      <span>Operational status: {detailStatusLabel}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {detailWorkTypes.map((name) => <Badge key={'type-' + name} variant="secondary">{name}</Badge>)}
                      {detailCategories.map((name) => <Badge key={'cat-' + name} variant="outline">{name}</Badge>)}
                      {!detailWorkTypes.length && <span className="text-sm text-neutral-500">No public work types listed</span>}
                    </div>
                  </section>

                  {detailWorker.previousCompanies && <section><h3 className="mb-1.5 text-sm font-semibold">Experience</h3><p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{detailWorker.previousCompanies}</p></section>}
                  {(detailWorker.education || detailWorker.certifications) && (
                    <section>
                      <h3 className="mb-1.5 text-sm font-semibold">Education & qualification</h3>
                      {detailWorker.education && <p className="text-sm text-neutral-600 dark:text-neutral-300">{formatLabel(detailWorker.education)}</p>}
                      {detailWorker.certifications && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{detailWorker.certifications}</p>}
                    </section>
                  )}

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Availability & service area</h3>
                    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {locationOf(detailWorker) && <div><dt className="text-xs text-neutral-500">Service area</dt><dd className="text-sm font-medium">{locationOf(detailWorker)}</dd></div>}
                      <div><dt className="text-xs text-neutral-500">Operational status</dt><dd className="text-sm font-medium">{detailStatusLabel}</dd></div>
                      {detailWorker.gender && <div><dt className="text-xs text-neutral-500">Gender</dt><dd className="text-sm font-medium">{formatLabel(detailWorker.gender)}</dd></div>}
                      {detailWorker.rating > 0 && <div><dt className="text-xs text-neutral-500">Rating</dt><dd className="text-sm font-medium">{detailWorker.rating.toFixed(1)} ({detailWorker.totalReviews} reviews)</dd></div>}
                      {!!detailWorker.languagesKnown?.length && <div><dt className="text-xs text-neutral-500">Languages</dt><dd className="text-sm font-medium">{detailWorker.languagesKnown.join(', ')}</dd></div>}
                      {!!detailWorker.employmentTypes?.length && <div><dt className="text-xs text-neutral-500">Employment types</dt><dd className="text-sm font-medium">{detailWorker.employmentTypes.map(formatLabel).join(', ')}</dd></div>}
                      {detailWorker.workMode && <div><dt className="text-xs text-neutral-500">Work mode</dt><dd className="text-sm font-medium">{formatLabel(detailWorker.workMode)}</dd></div>}
                      {detailWorker.workGeography && <div><dt className="text-xs text-neutral-500">Work geography</dt><dd className="text-sm font-medium">{formatLabel(detailWorker.workGeography)}</dd></div>}
                      {detailWorker.availableTimings && <div><dt className="text-xs text-neutral-500">Available timings</dt><dd className="text-sm font-medium">{detailWorker.availableTimings}</dd></div>}
                      {detailWorker.preferredWorkingRadius !== undefined && <div><dt className="text-xs text-neutral-500">Preferred working radius</dt><dd className="text-sm font-medium">{detailWorker.preferredWorkingRadius} km</dd></div>}
                      {detailWorker.canRelocate && <div><dt className="text-xs text-neutral-500">Relocation</dt><dd className="text-sm font-medium">Can relocate</dd></div>}
                    </dl>
                  </section>
                </div>

                <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-background p-4 dark:border-neutral-800 sm:flex-row sm:justify-end sm:px-6">
                  <Button variant="outline" onClick={() => setSelectedWorkerId(null)}>Close</Button>
                  {detailAssociated ? (
                    <Button variant="outline" className="text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => { setSelectedWorkerId(null); setWorkerToRemove(detailWorker); }}>Remove from workforce</Button>
                  ) : (
                    <Button disabled={limitReached || addMutation.isPending} onClick={() => addMutation.mutate(detailWorker)}>
                      {addMutation.isPending && addMutation.variables?.id === detailWorker.id ? 'Adding…' : limitReached ? 'Limit reached' : 'Add to workforce'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!workerToRemove} onOpenChange={(open) => { if (!open) setWorkerToRemove(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Remove this worker?</AlertDialogTitle><AlertDialogDescription>This removes {workerToRemove?.user?.name || 'this worker'} from your workforce. Their NearPassway worker account stays unchanged, and you can add them again from Find Workers.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removeMutation.isPending}>Keep worker</AlertDialogCancel>
              <AlertDialogAction disabled={removeMutation.isPending} onClick={(event) => { event.preventDefault(); if (workerToRemove) removeMutation.mutate(workerToRemove.id); }} className="bg-red-600 text-white hover:bg-red-700">
                {removeMutation.isPending ? 'Removing…' : 'Remove from workforce'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={inviteInfoOpen} onOpenChange={setInviteInfoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Worker invitations are coming soon</AlertDialogTitle><AlertDialogDescription>You'll be able to invite workers who aren't on NearPassway yet from here. No invitation will be sent or recorded for now.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogAction onClick={() => setInviteInfoOpen(false)}>Got it</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PartnerLayout>
  );
}
