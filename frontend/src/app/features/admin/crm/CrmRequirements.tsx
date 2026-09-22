import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AdminLayout from '../../../layouts/AdminLayout';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { crmService, categoryService } from '../../../services/api';
import type {
  AssignmentMode,
  CrmRequirementFilters,
  RequirementStatus,
} from '../../../types';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

// ── Display-only label/style maps (no new data, just formatting) ───────────

const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  MATCHING: 'Matching',
  FILLED: 'Filled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const REQUIREMENT_STATUS_STYLES: Record<RequirementStatus, string> = {
  DRAFT: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
  OPEN: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  MATCHING: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  FILLED: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  COMPLETED: 'bg-black dark:bg-white text-white dark:text-black',
  CANCELLED: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
};

const ASSIGNMENT_MODE_LABELS: Record<AssignmentMode, string> = {
  PREFERRED_SINGLE: 'Preferred Single',
  SINGLE_WITH_BACKUP: 'Single + Backup',
  BULK_WORKFORCE: 'Bulk Workforce',
};

const STATUS_FILTER_OPTIONS = [
  'DRAFT',
  'OPEN',
  'MATCHING',
  'FILLED',
  'COMPLETED',
  'CANCELLED',
] as const;

function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <Badge className={REQUIREMENT_STATUS_STYLES[status]}>
      {REQUIREMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-IN') : '—';

const shortId = (id: string) => `#${id.slice(0, 8)}`;

// Shared control styling consistent with the ui/input look.
const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';

// ── Page ────────────────────────────────────────────────────────────────────

export default function CrmRequirements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const PAGE_LIMIT = 10;

  // Committed filters go to the API; search is debounced before committing.
  const [status, setStatus] = useState<RequirementStatus | ''>('');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'sequence'],
    queryFn: () => categoryService.getAll('sequence'),
    staleTime: 5 * 60 * 1000,
  });

  const filters: CrmRequirementFilters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      ...(status ? { status } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(subCategoryId ? { subCategoryId } : {}),
      ...(searchTerm ? { search: searchTerm } : {}),
    }),
    [page, status, city, categoryId, subCategoryId, searchTerm]
  );

  const {
    data: result,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['crm-requirements', filters],
    queryFn: () => crmService.getRequirements(filters),
    placeholderData: (prev) => prev,
  });

  const generateMatchesMutation = useMutation({
    mutationFn: (requirementId: string) => crmService.generateMatches(requirementId),
    onSuccess: (_data, requirementId) => {
      queryClient.invalidateQueries({ queryKey: ['crm-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['crm-requirement', requirementId] });
      queryClient.invalidateQueries({ queryKey: ['crm-requirement-pipeline', requirementId] });
      toast.success('Matches generated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to generate matches');
    },
  });

  const requirements = result?.data ?? [];
  const pagination = result?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const subCategoryOptions = useMemo(() => {
    const source = selectedCategory ? [selectedCategory] : categories ?? [];
    const seen = new Set<string>();
    const options: { id: string; name: string; categoryName?: string }[] = [];
    for (const category of source) {
      for (const sub of category.subCategories ?? []) {
        if (!seen.has(sub.id)) {
          seen.add(sub.id);
          options.push({
            id: sub.id,
            name: sub.name,
            categoryName: category.name,
          });
        }
      }
    }
    return options;
  }, [categories, selectedCategory]);

  const hasActiveFilters =
    !!status || !!city.trim() || !!categoryId || !!subCategoryId || !!searchTerm;

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatus('');
    setCity('');
    setCategoryId('');
    setSubCategoryId('');
    setPage(1);
  };

  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as any)?.message ||
    'Unable to load requirements.';

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Requirements</h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Workforce requirements, matching and assignment status.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-fit"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ── Filters ───────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <Label htmlFor="crm-search" className="mb-1.5 text-xs">
                  Search
                </Label>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                  <Input
                    id="crm-search"
                    placeholder="Search requirements…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="crm-status" className="mb-1.5 text-xs">
                  Status
                </Label>
                <select
                  id="crm-status"
                  value={status}
                  onChange={(e) =>
                    changeFilter(() => setStatus(e.target.value as RequirementStatus | ''))
                  }
                  className={selectClass}
                >
                  <option value="">All statuses</option>
                  {STATUS_FILTER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {REQUIREMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="crm-city" className="mb-1.5 text-xs">
                  City
                </Label>
                <Input
                  id="crm-city"
                  placeholder="e.g. Purulia"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => setPage(1)}
                />
              </div>

              <div>
                <Label htmlFor="crm-category" className="mb-1.5 text-xs">
                  Category
                </Label>
                <select
                  id="crm-category"
                  value={categoryId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCategoryId(next);
                    setSubCategoryId('');
                    setPage(1);
                  }}
                  className={selectClass}
                >
                  <option value="">All categories</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="crm-subcategory" className="mb-1.5 text-xs">
                  Work Type
                </Label>
                <select
                  id="crm-subcategory"
                  value={subCategoryId}
                  onChange={(e) => changeFilter(() => setSubCategoryId(e.target.value))}
                  className={selectClass}
                >
                  <option value="">All work types</option>
                  {subCategoryOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {selectedCategory ? s.name : `${s.categoryName ? `${s.categoryName} · ` : ''}${s.name}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(hasActiveFilters || city.trim()) && (
              <div className="mt-3 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  City filter applies on blur / Enter
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Results ───────────────────────────────────────────────── */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              Loading requirements…
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0 sm:p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 lg:px-6">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {pagination
                      ? `${pagination.total} requirement${pagination.total === 1 ? '' : 's'}`
                      : 'Requirements'}
                    {isFetching && !isLoading ? (
                      <span className="ml-2 text-xs text-neutral-400">Updating…</span>
                    ) : null}
                  </p>
                </div>

                {requirements.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-neutral-500">
                      {hasActiveFilters
                        ? 'No requirements found for the selected filters.'
                        : 'No requirements found'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop / tablet table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                            <th className="px-4 py-3 font-medium lg:px-6">Requirement</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Work Type</th>
                            <th className="px-4 py-3 font-medium">Location</th>
                            <th className="px-4 py-3 font-medium">Joining</th>
                            <th className="px-4 py-3 font-medium">Workers</th>
                            <th className="px-4 py-3 font-medium">Mode</th>
                            <th className="px-4 py-3 font-medium">Candidates</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 text-right font-medium lg:px-6">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {requirements.map((req) => (
                            <tr
                              key={req.id}
                              onClick={() => navigate(`/admin/crm/requirements/${req.id}`)}
                              className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                            >
                              <td className="px-4 py-3 lg:px-6">
                                <p className="font-medium">{shortId(req.id)}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {formatDate(req.createdAt)}
                                </p>
                              </td>
                              <td className="px-4 py-3">{req.category?.name ?? '—'}</td>
                              <td className="px-4 py-3">{req.subCategory?.name ?? '—'}</td>
                              <td className="px-4 py-3">
                                {req.city}
                                {req.state ? (
                                  <span className="text-neutral-500">, {req.state}</span>
                                ) : null}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {formatDate(req.joiningDate)}
                              </td>
                              <td className="px-4 py-3">{req.requiredWorkerCount}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">
                                {ASSIGNMENT_MODE_LABELS[req.assignmentMode] ?? req.assignmentMode}
                              </td>
                              <td className="px-4 py-3">{req._count?.candidates ?? '—'}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={req.status} />
                              </td>
                       <td className="px-4 py-3 text-right lg:px-6">
  <div
    className="flex items-center justify-end gap-1"
    onClick={(e) => e.stopPropagation()}
  >
    {(req.status === 'OPEN' || req.status === 'MATCHING') && (
      <Button
        variant="ghost"
        size="sm"
        title="Generate matches"
        onClick={() =>
          generateMatchesMutation.mutate(req.id)
        }
        disabled={
          generateMatchesMutation.isPending &&
          generateMatchesMutation.variables === req.id
        }
      >
        <Sparkles
          className={`mr-1.5 h-4 w-4 ${
            generateMatchesMutation.isPending &&
            generateMatchesMutation.variables === req.id
              ? 'animate-spin'
              : ''
          }`}
        />
        <span className="hidden lg:inline">Matches</span>
      </Button>
    )}

    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        navigate(`/admin/crm/requirements/${req.id}`)
      }
    >
      View
    </Button>
  </div>
</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile stacked cards */}
                    <ul className="divide-y divide-neutral-200 md:hidden dark:divide-neutral-800">
                      {requirements.map((req) => (
                        <li key={req.id} className="p-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/crm/requirements/${req.id}`)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {req.subCategory?.name ?? 'Requirement'}
                                </p>
                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                  {shortId(req.id)}
                                  {req.category?.name ? ` · ${req.category.name}` : ''}
                                </p>
                              </div>
                              <StatusBadge status={req.status} />
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                              <span>
                                <span className="text-neutral-400">Location: </span>
                                {req.city}
                                {req.state ? `, ${req.state}` : ''}
                              </span>
                              <span>
                                <span className="text-neutral-400">Joining: </span>
                                {formatDate(req.joiningDate)}
                              </span>
                              <span>
                                <span className="text-neutral-400">Workers: </span>
                                {req.requiredWorkerCount}
                              </span>
                              <span>
                                <span className="text-neutral-400">Candidates: </span>
                                {req._count?.candidates ?? '—'}
                              </span>
                              <span className="col-span-2">
                                <span className="text-neutral-400">Mode: </span>
                                {ASSIGNMENT_MODE_LABELS[req.assignmentMode] ?? req.assignmentMode}
                              </span>
                            </div>
                          </button>
                          {(req.status === 'OPEN' || req.status === 'MATCHING') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 w-full"
                              onClick={() => generateMatchesMutation.mutate(req.id)}
                              disabled={
                                generateMatchesMutation.isPending &&
                                generateMatchesMutation.variables === req.id
                              }
                            >
                              <Sparkles
                                className={`mr-1.5 h-4 w-4 ${
                                  generateMatchesMutation.isPending &&
                                  generateMatchesMutation.variables === req.id
                                    ? 'animate-spin'
                                    : ''
                                }`}
                              />
                              Generate Matches
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Pagination — driven by the API response */}
                {pagination && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 lg:px-6 dark:border-neutral-800">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {pagination.total > 0
                        ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                            pagination.page * pagination.limit,
                            pagination.total
                          )} of ${pagination.total}`
                        : 'Showing 0 of 0'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1 || isFetching}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        Page {pagination.page} of {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= totalPages || isFetching}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
