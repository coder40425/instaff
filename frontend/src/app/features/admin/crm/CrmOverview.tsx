import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { crmService } from '../../../services/api';
import type { RequirementStatus } from '../../../types';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  ChevronRight,
  RefreshCw,
  UserCheck,
  Users,
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

function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <Badge className={REQUIREMENT_STATUS_STYLES[status]}>
      {REQUIREMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-IN') : '—';

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

const shortId = (id: string) => `#${id.slice(0, 8)}`;

// ── Small local display primitives ──────────────────────────────────────────

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          emphasis && value > 0
            ? 'text-amber-600 dark:text-amber-400'
            : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionEmpty({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CrmOverview() {
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['crm-overview'],
    queryFn: crmService.getOverview,
  });

  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as any)?.message ||
    'Unable to load the CRM overview.';

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">CRM / Operations</h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Loading operations overview…
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              Loading operations overview…
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (isError || !overview) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">CRM / Operations</h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Manage workforce requirements, matching and assignments.
            </p>
          </div>
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
        </div>
      </AdminLayout>
    );
  }

  const { requirements, matching, attention, recentRequirements, recentAssignments } = overview;

  // Only "needs attention" rows backed by real admin destinations are linked;
  // the two CRM-side counters are informational because /admin/crm/requirements
  // does not currently expose a status/city filter deep link contract.
  const attentionItems = [
    {
      key: 'requirementsNeedingMatching',
      label: 'Requirements Needing Matching',
      value: attention.requirementsNeedingMatching,
      hint: 'Open requirements with no candidates generated yet',
      href: '/admin/crm/requirements',
    },
    {
      key: 'requirementsNeedingAssignment',
      label: 'Requirements Needing Assignment',
      value: attention.requirementsNeedingAssignment,
      hint: 'Matching requirements with candidates ready to be assigned',
      href: '/admin/crm/requirements',
    },
    {
      key: 'pendingWorkers',
      label: 'Pending Workers',
      value: attention.pendingWorkers,
      hint: 'Worker profiles awaiting verification',
      href: '/admin/workers/pending',
    },
    {
      key: 'pendingBookings',
      label: 'Pending Bookings',
      value: attention.pendingBookings,
      hint: 'Bookings waiting for worker response',
      href: '/admin/bookings',
    },
    {
      key: 'openComplaints',
      label: 'Open Complaints',
      value: attention.openComplaints,
      hint: 'Complaints awaiting admin action',
      href: '/admin/complaints',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">CRM / Operations</h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Manage workforce requirements, matching and assignments.
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

        {/* ── Requirements summary ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Open Requirements
              </CardTitle>
              <Briefcase className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{requirements.open}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Matching Requirements
              </CardTitle>
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{requirements.matching}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Filled Requirements
              </CardTitle>
              <UserCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{requirements.filled}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Fulfillment + matching pipeline ───────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Worker Fulfillment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Required" value={requirements.workersRequired} />
                <Metric label="Assigned" value={requirements.workersAssigned} />
                <Metric label="Remaining" value={requirements.workersRemaining} emphasis />
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-black dark:bg-white transition-all"
                  style={{
                    width: `${
                      requirements.workersRequired > 0
                        ? Math.min(
                            Math.round(
                              (requirements.workersAssigned / requirements.workersRequired) * 100
                            ),
                            100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Active requirements (Open + Matching)
                </span>
                <span className="font-semibold">{requirements.active}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Matching &amp; Assignment</CardTitle>
              <Link
                to="/admin/crm/requirements"
                className="text-sm font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              >
                All requirements →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Metric label="Recommended" value={matching.recommended} />
                <Metric label="Shortlisted" value={matching.shortlisted} />
                <Metric label="Primary" value={matching.primary} />
                <Metric label="Backup" value={matching.backup} />
                <Metric label="Assigned" value={matching.assigned} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Needs attention ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {attentionItems.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.value > 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {item.value}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {item.hint}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ── Recent activity ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Recent Requirements</CardTitle>
              <Link
                to="/admin/crm/requirements"
                className="text-sm font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {recentRequirements.length === 0 ? (
                <div className="px-6 pb-6">
                  <SectionEmpty text="No requirements found" />
                </div>
              ) : (
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {recentRequirements.map((req) => (
                    <li key={req.id}>
                      <Link
                        to={`/admin/crm/requirements/${req.id}`}
                        className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {req.subCategory?.name ?? 'Requirement'}
                            </span>
                            <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                              {req.category?.name}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {[shortId(req.id), req.city, `Joining ${formatDate(req.joiningDate)}`]
                              .filter(Boolean)
                              .join(' · ')}
                            {' · '}
                            {req.requiredWorkerCount} worker
                            {req.requiredWorkerCount === 1 ? '' : 's'} required
                          </span>
                        </span>
                        <StatusBadge status={req.status} />
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Recent Assignments</CardTitle>
              <Users className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {recentAssignments.length === 0 ? (
                <div className="px-6 pb-6">
                  <SectionEmpty text="No assignments yet" />
                </div>
              ) : (
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {recentAssignments.map((assignment) => (
                    <li key={assignment.id}>
                      <Link
                        to={`/admin/crm/requirements/${assignment.requirementId}`}
                        className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        {assignment.workerProfile?.profilePhotoUrl ? (
                          <img
                            src={assignment.workerProfile.profilePhotoUrl}
                            alt={assignment.workerProfile.user?.name ?? 'Worker'}
                            className="h-9 w-9 flex-shrink-0 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
                          />
                        ) : (
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <Users className="h-4 w-4 text-neutral-400" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {assignment.workerProfile?.user?.name ?? 'Worker'}
                          </span>
                          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {assignment.requirement.subCategory?.name ??
                              assignment.requirement.category?.name ??
                              'Requirement'}{' '}
                            · {assignment.requirement.city} · Assigned{' '}
                            {formatDateTime(assignment.assignedAt)}
                          </span>
                        </span>
                        <StatusBadge status={assignment.requirement.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
