import { useMemo, useState } from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { toast } from 'sonner';

import AdminLayout from '../../../layouts/AdminLayout';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

import { crmService } from '../../../services/api';

import type {
  AssignmentMode,
  RequirementCandidateStatus,
  RequirementStatus,
} from '../../../types';

import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

const REQUIREMENT_STATUS_LABELS: Record<
  RequirementStatus,
  string
> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  MATCHING: 'Matching',
  FILLED: 'Filled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const REQUIREMENT_STATUS_STYLES: Record<
  RequirementStatus,
  string
> = {
  DRAFT:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',

  OPEN:
    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',

  MATCHING:
    'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',

  FILLED:
    'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',

  COMPLETED:
    'bg-black dark:bg-white text-white dark:text-black',

  CANCELLED:
    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
};

const ASSIGNMENT_MODE_LABELS: Record<
  AssignmentMode,
  string
> = {
  PREFERRED_SINGLE: 'Preferred Single',
  SINGLE_WITH_BACKUP: 'Single + Backup',
  BULK_WORKFORCE: 'Bulk Workforce',
};

const CANDIDATE_STATUS_LABELS: Record<
  RequirementCandidateStatus,
  string
> = {
  RECOMMENDED: 'Recommended',
  SHORTLISTED: 'Shortlisted',
  PRIMARY: 'Primary',
  BACKUP: 'Backup',
  ASSIGNED: 'Assigned',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

const CANDIDATE_STATUS_STYLES: Record<
  RequirementCandidateStatus,
  string
> = {
  RECOMMENDED:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',

  SHORTLISTED:
    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',

  PRIMARY:
    'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',

  BACKUP:
    'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',

  ASSIGNED:
    'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',

  REJECTED:
    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',

  EXPIRED:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400',
};

const ASSIGNABLE_STATUSES: RequirementCandidateStatus[] = [
  'RECOMMENDED',
  'SHORTLISTED',
  'PRIMARY',
  'BACKUP',
];

function RequirementStatusBadge({
  status,
}: {
  status: RequirementStatus;
}) {
  return (
    <Badge
      className={
        REQUIREMENT_STATUS_STYLES[status]
      }
    >
      {REQUIREMENT_STATUS_LABELS[status] ??
        status}
    </Badge>
  );
}

function CandidateStatusBadge({
  status,
}: {
  status: RequirementCandidateStatus;
}) {
  return (
    <Badge
      className={
        CANDIDATE_STATUS_STYLES[status]
      }
    >
      {CANDIDATE_STATUS_LABELS[status] ??
        status}
    </Badge>
  );
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>

      <p className="mt-0.5 break-words text-sm font-medium">
        {children}
      </p>
    </div>
  );
}

function CandidateAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 flex-shrink-0 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
      <Users className="h-4 w-4 text-neutral-400" />
    </span>
  );
}

function formatDate(
  value?: string | null
) {
  return value
    ? new Date(value).toLocaleDateString(
        'en-IN'
      )
    : '—';
}

function formatDateTime(
  value?: string | null
) {
  return value
    ? new Date(value).toLocaleString(
        'en-IN',
        {
          dateStyle: 'medium',
          timeStyle: 'short',
        }
      )
    : '—';
}

function shortId(id: string) {
  return `#${id.slice(0, 8)}`;
}

function getErrorMessage(error: any) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong.'
  );
}

export default function CrmRequirementDetails() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      RequirementCandidateStatus | ''
    >('');

  /*
   * Requirement detail
   */
  const {
    data: requirement,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } =
    useQuery({
      queryKey: [
        'crm-requirement',
        id,
      ],

      queryFn: () =>
        crmService.getRequirement(id!),

      enabled: Boolean(id),
    });

  /*
   * Pipeline
   */
  const {
    data: pipeline,
    isFetching:
      pipelineFetching,
    refetch:
      refetchPipeline,
  } =
    useQuery({
      queryKey: [
        'crm-requirement-pipeline',
        id,
      ],

      queryFn: () =>
        crmService.getRequirementPipeline(
          id!
        ),

      enabled: Boolean(id),
    });

  /*
   * Refresh both CRM resources.
   */
  const refreshAll = () => {
    queryClient.invalidateQueries({
      queryKey: [
        'crm-requirement',
        id,
      ],
    });

    queryClient.invalidateQueries({
      queryKey: [
        'crm-requirement-pipeline',
        id,
      ],
    });
  };

  /*
   * Generate matches
   */
  const generateMatchesMutation =
    useMutation({
      mutationFn: () =>
        crmService.generateMatches(
          id!
        ),

      onSuccess: (candidates) => {
        refreshAll();

        toast.success(
          `Matches generated — ${
            candidates?.length ?? 0
          } candidate${
            candidates?.length === 1
              ? ''
              : 's'
          }`
        );
      },

      onError: (err: any) => {
        toast.error(
          getErrorMessage(err)
        );
      },
    });

  /*
   * Build assignment pool
   */
  const buildPoolMutation =
    useMutation({
      mutationFn: () =>
        crmService.buildAssignmentPool(
          id!
        ),

      onSuccess: (candidates) => {
        refreshAll();

        toast.success(
          `Assignment pool built — ${
            candidates?.length ?? 0
          } candidate${
            candidates?.length === 1
              ? ''
              : 's'
          }`
        );
      },

      onError: (err: any) => {
        toast.error(
          getErrorMessage(err)
        );
      },
    });

  /*
   * Assign worker
   */
  const assignMutation =
    useMutation({
      mutationFn: (
        workerProfileId: string
      ) =>
        crmService.assignWorker(
          id!,
          workerProfileId
        ),

      onSuccess: () => {
        refreshAll();

        queryClient.invalidateQueries({
          queryKey: [
            'crm-requirements',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'crm-overview',
          ],
        });

        toast.success(
          'Worker assigned successfully'
        );
      },

      onError: (err: any) => {
        toast.error(
          getErrorMessage(err)
        );
      },
    });

  const candidates =
    requirement?.candidates ?? [];

  const visibleCandidates =
    useMemo(
      () =>
        statusFilter
          ? candidates.filter(
              (candidate) =>
                candidate.status ===
                statusFilter
            )
          : candidates,
      [
        candidates,
        statusFilter,
      ]
    );

  const pipelineCounts =
    pipeline?.pipeline;

  const fulfillment =
    pipeline?.fulfillment;

  const requirementOpen =
    requirement?.status ===
      'OPEN' ||
    requirement?.status ===
      'MATCHING';

  const slotsFilled =
    fulfillment
      ? fulfillment.remaining <= 0
      : false;

  const actionsRunning =
    generateMatchesMutation.isPending ||
    buildPoolMutation.isPending ||
    assignMutation.isPending;

  const canAssignCandidate = (
    status: RequirementCandidateStatus
  ) =>
    requirementOpen &&
    !slotsFilled &&
    ASSIGNABLE_STATUSES.includes(
      status
    );

  const errorMessage =
    getErrorMessage(error);

  /*
   * Loading
   */
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">

          <h1 className="text-3xl font-bold">
            Requirement Details
          </h1>

          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              Loading requirement…
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    );
  }

  /*
   * Error
   */
  if (
    isError ||
    !requirement
  ) {
    return (
      <AdminLayout>
        <div className="space-y-6">

          <Link
            to="/admin/crm/requirements"
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Requirements
          </Link>

          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">

              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />

              <div>
                <p className="text-sm font-medium">
                  Unable to load this requirement
                </p>

                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {errorMessage}
                </p>
              </div>

              <div className="flex gap-2">

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    refetch()
                  }
                  disabled={
                    isFetching
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate(
                      '/admin/crm/requirements'
                    )
                  }
                >
                  Back
                </Button>

              </div>
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    );
  }

  const pipelineStages = [
    {
      label: 'Recommended',
      count:
        pipelineCounts?.recommended ??
        0,
    },
    {
      label: 'Shortlisted',
      count:
        pipelineCounts?.shortlisted ??
        0,
    },
    {
      label: 'Primary',
      count:
        pipelineCounts?.primary ??
        0,
    },
    {
      label: 'Backup',
      count:
        pipelineCounts?.backup ??
        0,
    },
    {
      label: 'Assigned',
      count:
        pipelineCounts?.assigned ??
        0,
    },
  ];

  const fulfillmentPercentage =
    fulfillment &&
    fulfillment.required > 0
      ? Math.min(
          Math.round(
            (fulfillment.assigned /
              fulfillment.required) *
              100
          ),
          100
        )
      : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="space-y-3">

          <Link
            to="/admin/crm/requirements"
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Requirements
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-2xl font-bold sm:text-3xl">
                  {requirement.subCategory?.name ??
                    'Requirement'}
                </h1>

                <RequirementStatusBadge
                  status={
                    requirement.status
                  }
                />

              </div>

              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {[
                  shortId(
                    requirement.id
                  ),
                  requirement.category
                    ?.name,
                  requirement.city,
                  `Joining ${formatDate(
                    requirement.joiningDate
                  )}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

            </div>

            <div className="flex flex-wrap gap-2">

              {requirementOpen && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      generateMatchesMutation.mutate()
                    }
                    disabled={
                      actionsRunning
                    }
                  >
                    <Sparkles
                      className={`mr-2 h-4 w-4 ${
                        generateMatchesMutation.isPending
                          ? 'animate-spin'
                          : ''
                      }`}
                    />

                    {generateMatchesMutation.isPending
                      ? 'Generating…'
                      : 'Generate Matches'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      buildPoolMutation.mutate()
                    }
                    disabled={
                      actionsRunning
                    }
                  >
                    <UserCheck
                      className={`mr-2 h-4 w-4 ${
                        buildPoolMutation.isPending
                          ? 'animate-spin'
                          : ''
                      }`}
                    />

                    {buildPoolMutation.isPending
                      ? 'Building…'
                      : 'Build Assignment Pool'}
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetch();
                  refetchPipeline();
                }}
                disabled={
                  isFetching ||
                  pipelineFetching
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isFetching ||
                    pipelineFetching
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </Button>

            </div>
          </div>
        </div>

        {/* Requirement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Requirement
            </CardTitle>
          </CardHeader>

          <CardContent>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

              <InfoItem label="Category">
                {requirement.category?.name ??
                  '—'}
              </InfoItem>

              <InfoItem label="Work Type">
                {requirement.subCategory?.name ??
                  '—'}
              </InfoItem>

              <InfoItem label="Location">
                {requirement.city}
                {requirement.state
                  ? `, ${requirement.state}`
                  : ''}
              </InfoItem>

              <InfoItem label="Joining Date">
                {formatDate(
                  requirement.joiningDate
                )}
              </InfoItem>

              <InfoItem label="Required Workers">
                {requirement.requiredWorkerCount}
              </InfoItem>

              <InfoItem label="Min. Experience">
                {requirement.minExperience} yr
                {requirement.minExperience ===
                1
                  ? ''
                  : 's'}
              </InfoItem>

              <InfoItem label="Shift Timing">
                {requirement.shiftTiming ??
                  '—'}
              </InfoItem>

              <InfoItem label="Salary Budget">
                {requirement.salaryBudget !=
                null
                  ? `₹${requirement.salaryBudget}`
                  : '—'}
              </InfoItem>

              <InfoItem label="Assignment Mode">
                {ASSIGNMENT_MODE_LABELS[
                  requirement.assignmentMode
                ] ??
                  requirement.assignmentMode}
              </InfoItem>

              <InfoItem label="Backup Pool Size">
                {requirement.backupPoolSize}
              </InfoItem>

              <InfoItem label="Employment Types">
                {requirement.employmentTypes?.length
                  ? requirement.employmentTypes
                      .map((type) =>
                        type.replace(
                          /_/g,
                          ' '
                        )
                      )
                      .join(', ')
                  : '—'}
              </InfoItem>

              <InfoItem label="Work Mode">
                {requirement.workMode
                  ? requirement.workMode.replace(
                      /_/g,
                      ' '
                    )
                  : '—'}
              </InfoItem>

            </div>

            {requirement.preferredWorkerProfileId && (
              <div className="mt-4 flex items-center gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <UserCheck className="h-4 w-4" />
                Preferred worker selected
              </div>
            )}

          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">

            <CardTitle className="text-sm font-semibold">
              Matching & Assignment Pipeline
            </CardTitle>

            {fulfillment && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Assigned{' '}
                {fulfillment.assigned} of{' '}
                {fulfillment.required}
                {' · '}
                {fulfillment.remaining}{' '}
                remaining
              </p>
            )}

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">

              {pipelineStages.map(
                (stage) => (
                  <div
                    key={stage.label}
                    className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {stage.label}
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {stage.count}
                    </p>
                  </div>
                )
              )}

            </div>

            {fulfillment && (
              <div>

                <div className="mb-2 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>
                    Fulfillment
                  </span>

                  <span>
                    {fulfillmentPercentage}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-black transition-all dark:bg-white"
                    style={{
                      width: `${fulfillmentPercentage}%`,
                    }}
                  />
                </div>

              </div>
            )}

          </CardContent>
        </Card>

        {/* Candidate list */}
        <Card>

          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <CardTitle className="text-sm font-semibold">
                Candidates
              </CardTitle>

              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Matching candidates available for operational assignment.
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | RequirementCandidateStatus
                    | ''
                )
              }
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
            >
              <option value="">
                All candidates
              </option>

              {(
                Object.keys(
                  CANDIDATE_STATUS_LABELS
                ) as RequirementCandidateStatus[]
              ).map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {
                    CANDIDATE_STATUS_LABELS[
                      status
                    ]
                  }
                </option>
              ))}
            </select>

          </CardHeader>

          <CardContent className="p-0">

            {visibleCandidates.length ===
            0 ? (
              <div className="px-6 py-12 text-center">

                <Users className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-700" />

                <p className="mt-3 text-sm text-neutral-500">
                  No candidates in this stage.
                </p>

                {requirementOpen && (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() =>
                      generateMatchesMutation.mutate()
                    }
                    disabled={
                      actionsRunning
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Matches
                  </Button>
                )}

              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">

                {visibleCandidates.map(
                  (candidate) => {

                    const worker =
                      candidate.workerProfile;

                    const workerName =
                      worker?.user?.name ??
                      'Worker';

                    const skills =
                      worker?.skills
                        ?.map(
                          (skill) =>
                            skill.subCategory
                              ?.name
                        )
                        .filter(
                          (
                            value
                          ): value is string =>
                            Boolean(value)
                        ) ?? [];

                    const assignable =
                      canAssignCandidate(
                        candidate.status
                      );

                    return (
                      <div
                        key={
                          candidate.id
                        }
                        className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:px-6"
                      >

                        <div className="flex min-w-0 items-start gap-3">

                          <CandidateAvatar
                            name={
                              workerName
                            }
                            photoUrl={
                              worker?.profilePhotoUrl
                            }
                          />

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-medium">
                                {workerName}
                              </p>

                              <CandidateStatusBadge
                                status={
                                  candidate.status
                                }
                              />

                              {worker?.isVerified && (
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                              )}

                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">

                              <span>
                                {worker?.experience ??
                                  0}{' '}
                                yr
                                {(worker?.experience ??
                                  0) === 1
                                  ? ''
                                  : 's'}{' '}
                                experience
                              </span>

                              {worker?.city && (
                                <span>
                                  {worker.city}
                                  {worker.state
                                    ? `, ${worker.state}`
                                    : ''}
                                </span>
                              )}

                              {worker?.rating !=
                                null && (
                                <span>
                                  Rating:{' '}
                                  {worker.rating}
                                </span>
                              )}

                            </div>

                            {skills.length >
                              0 && (
                              <div className="mt-2 flex flex-wrap gap-1">

                                {skills
                                  .slice(
                                    0,
                                    5
                                  )
                                  .map(
                                    (
                                      skill
                                    ) => (
                                      <Badge
                                        key={
                                          skill
                                        }
                                        variant="secondary"
                                        className="text-xs font-normal"
                                      >
                                        {
                                          skill
                                        }
                                      </Badge>
                                    )
                                  )}

                              </div>
                            )}

                            {candidate.matchReason && (
                              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                {
                                  candidate.matchReason
                                }
                              </p>
                            )}

                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 lg:justify-end">

                          <div className="text-right">

                            {candidate.matchScore !=
                              null && (
                              <p className="text-sm font-semibold">
                                {
                                  candidate.matchScore
                                }
                                %
                              </p>
                            )}

                            {candidate.rank !=
                              null && (
                              <p className="text-xs text-neutral-500">
                                Rank #
                                {
                                  candidate.rank
                                }
                              </p>
                            )}

                          </div>

                          {assignable && (
                            <Button
                              size="sm"
                              onClick={() =>
                                assignMutation.mutate(
                                  candidate.workerProfileId
                                )
                              }
                              disabled={
                                actionsRunning ||
                                assignMutation.isPending
                              }
                            >
                              {assignMutation.isPending &&
                              assignMutation.variables ===
                                candidate.workerProfileId ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Assigning…
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Assign
                                </>
                              )}
                            </Button>
                          )}

                        </div>
                      </div>
                    );
                  }
                )}

              </div>
            )}

          </CardContent>
        </Card>

        {/* Assignment status */}
        {fulfillment && (
          <Card>

            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <Users className="h-4 w-4 text-neutral-500" />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Assignment progress
                  </p>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {fulfillment.assigned} assigned ·{' '}
                    {fulfillment.remaining} remaining
                  </p>
                </div>

              </div>

              {requirement.status ===
                'FILLED' && (
                <Badge>
                  Requirement Filled
                </Badge>
              )}

            </CardContent>

          </Card>
        )}

      </div>
    </AdminLayout>
  );
}