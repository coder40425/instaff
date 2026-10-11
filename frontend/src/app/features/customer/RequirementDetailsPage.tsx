import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';

import CustomerLayout from '../../layouts/CustomerLayout';
import PartnerLayout from '../../layouts/PartnerLayout';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

import { requirementService, matchingService } from '../../services/api';

import type {
  RequirementCandidate,
  RequirementCandidateStatus,
  RequirementStatus,
  ShiftTiming,
} from '../../types';

import {
  MapPin,
  CalendarDays,
  Wallet,
  Users,
  Star,
  RefreshCw,
  Layers,
  UserCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ShieldCheck,
  User,
  ArrowLeft,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const REQUIREMENT_STATUS_STYLES: Record<RequirementStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  MATCHING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  FILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED: 'bg-black text-white dark:bg-white dark:text-black',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  EXPIRED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

const STATUS_STYLES: Record<RequirementCandidateStatus, string> = {
  RECOMMENDED:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  SHORTLISTED:
    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  PRIMARY:
    'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  BACKUP:
    'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  OFFERED:
    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  ASSIGNED:
    'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  REJECTED:
    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  EXPIRED:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
};

// Coloured left edge so a candidate's state reads at a glance.
const STATUS_ACCENT: Record<RequirementCandidateStatus, string> = {
  RECOMMENDED: 'border-l-neutral-400 dark:border-l-neutral-600',
  SHORTLISTED: 'border-l-blue-500',
  PRIMARY: 'border-l-purple-500',
  BACKUP: 'border-l-amber-500',
  OFFERED: 'border-l-blue-500',
  ASSIGNED: 'border-l-green-500',
  REJECTED: 'border-l-red-500',
  EXPIRED: 'border-l-neutral-300 dark:border-l-neutral-700',
};

const ASSIGNABLE_STATUSES: RequirementCandidateStatus[] = [
  'RECOMMENDED',
  'SHORTLISTED',
  'PRIMARY',
  'BACKUP',
];

function scoreTone(score?: number | null) {
  if (score == null) return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400';
  if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
  if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
  return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
}

function formatAssignmentMode(mode: string) {
  switch (mode) {
    case 'PREFERRED_SINGLE':
      return 'Preferred Worker';

    case 'SINGLE_WITH_BACKUP':
      return 'Primary + Backup';

    case 'BULK_WORKFORCE':
      return 'Bulk Workforce';

    default:
      return mode;
  }
}

const SHIFT_TIMING_LABELS: Record<ShiftTiming, string> = {
  DAY: 'Day',
  NIGHT: 'Night',
  LIVE_IN_24_HOURS: 'Live-in / 24 Hours',
};

function RequirementInfo({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words">{children}</p>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  return value
    ? new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
}

/* Icon tile used for the key facts at the top of the page. */
function FactTile({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/60">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-neutral-600 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-semibold break-words">{children}</p>
      </div>
    </div>
  );
}

/* Section heading: icon, title, count and a one-line hint. */
function SectionHeader({
  icon: Icon,
  iconClass = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  title,
  count,
  hint,
}: {
  icon?: LucideIcon;
  iconClass?: string;
  title: string;
  count?: number;
  hint?: string;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {count != null && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {count}
              </span>
            )}
          </div>
          {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
        </div>
      </div>
    </CardHeader>
  );
}

export default function RequirementDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPartner = user?.role === 'PARTNER';
  const PageLayout = isPartner ? PartnerLayout : CustomerLayout;
  const requirementsPath = isPartner ? '/partner/requirements' : '/customer/requirements';

  const {
    data: requirement,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['requirement', id],
    queryFn: () => requirementService.getById(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['requirement', id],
    });
  };

  const openMutation = useMutation({
    mutationFn: () => requirementService.open(id!),

    onSuccess: () => {
      toast.success('Requirement opened');
      invalidate();
    },

    onError: (e: any) => {
      toast.error(
        e.response?.data?.message || 'Failed to open requirement'
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => requirementService.cancel(id!),

    onSuccess: () => {
      toast.success('Requirement cancelled');
      invalidate();
    },

    onError: (e: any) => {
      toast.error(
        e.response?.data?.message || 'Failed to cancel requirement'
      );
    },
  });

  const matchMutation = useMutation({
    mutationFn: () => matchingService.generateMatches(id!),

    onSuccess: () => {
      toast.success('Matching candidates generated');
      invalidate();
    },

    onError: (e: any) => {
      toast.error(
        e.response?.data?.message || 'Failed to generate matches'
      );
    },
  });

  const poolMutation = useMutation({
    mutationFn: () => matchingService.buildAssignmentPool(id!),

    onSuccess: () => {
      toast.success('Assignment pool built');
      invalidate();
    },

    onError: (e: any) => {
      toast.error(
        e.response?.data?.message ||
          'Failed to build assignment pool'
      );
    },
  });

  const assignMutation = useMutation({
    mutationFn: (workerProfileId: string) =>
      matchingService.sendAssignmentOffer(id!, workerProfileId),

    onSuccess: (candidate) => {
      toast.success(
        candidate.status === 'OFFERED'
          ? 'Assignment offer sent. Waiting for worker acceptance.'
          : `Candidate status updated: ${candidate.status}`
      );
      invalidate();
    },

    onError: (e: any) => {
      toast.error(
        e.response?.data?.message || 'Failed to send assignment offer'
      );
    },
  });

  const replacementMutation = useMutation({
    mutationFn: ({ candidateId, reason }: { candidateId: string; reason: string }) =>
      matchingService.requestAssignmentReplacement(id!, candidateId, reason),
    onSuccess: async () => {
      toast.success('Replacement requested');
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ['partner-dashboard-summary'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to request replacement');
    },
  });

  const cancelReplacementMutation = useMutation({
    mutationFn: (replacementRequestId: string) =>
      matchingService.cancelAssignmentReplacement(id!, replacementRequestId),
    onSuccess: async () => {
      toast.success('Replacement request cancelled');
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ['partner-dashboard-summary'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to cancel replacement request');
    },
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20 text-neutral-500">
          Loading requirement…
        </div>
      </PageLayout>
    );
  }

  if (isError || !requirement) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
            <BriefcaseBusiness className="w-5 h-5 text-neutral-400" />
          </div>

          <div>
            <p className="font-semibold text-lg">
              Requirement not found
            </p>

            <p className="text-sm text-neutral-500 mt-1">
              This requirement may have been removed or is no longer
              available.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate(requirementsPath)}
          >
            Back to Requirements
          </Button>
        </div>
      </PageLayout>
    );
  }

  const candidates: RequirementCandidate[] = [
    ...(requirement.candidates ?? []),
  ].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const primaryCandidates = candidates.filter(
    (candidate) => candidate.status === 'PRIMARY'
  );

  const offeredCandidates = candidates.filter(
    (candidate) => candidate.status === 'OFFERED'
  );

  const replacementRequests = requirement.replacementRequests ?? [];
  const replacedCandidateIds = new Set(
    replacementRequests
      .filter((request) => request.status === 'RESOLVED')
      .map((request) => request.currentAssignmentCandidateId)
  );
  const assignedCandidates = candidates.filter(
    (candidate) =>
      candidate.status === 'ASSIGNED' &&
      !replacedCandidateIds.has(candidate.id) &&
      ['OPEN', 'MATCHING', 'FILLED'].includes(requirement.status)
  );

  const backupCandidates = candidates.filter(
    (candidate) => candidate.status === 'BACKUP'
  );

  const recommendedCandidates = candidates.filter(
    (candidate) =>
      candidate.status === 'RECOMMENDED' ||
      candidate.status === 'SHORTLISTED'
  );

  const otherCandidates = candidates.filter(
    (candidate) =>
      ![
        'PRIMARY',
        'ASSIGNED',
        'OFFERED',
        'BACKUP',
        'RECOMMENDED',
        'SHORTLISTED',
      ].includes(candidate.status)
  );

  const assignedCount = assignedCandidates.length;

  const preferredWorker = candidates.find(
    (candidate) =>
      candidate.workerProfileId ===
      requirement.preferredWorkerProfileId
  )?.workerProfile;

  const summaryMetrics = [
    { label: 'Candidates', value: String(candidates.length) },
    { label: 'Assigned', value: `${assignedCount} / ${requirement.requiredWorkerCount}` },
    { label: 'Primary', value: String(primaryCandidates.length) },
    { label: 'Backups', value: String(backupCandidates.length) },
  ];

  const assignCandidate = (candidate: RequirementCandidate) => {
    if (candidate.workerProfile) {
      assignMutation.mutate(candidate.workerProfile.id);
    }
  };

  /* Replacement controls shown inside each confirmed assignment. */
  const renderReplacementControls = (candidate: RequirementCandidate) => {
    const activeRequest = replacementRequests.find(
      (request) =>
        request.currentAssignmentCandidateId === candidate.id &&
        ['OPEN', 'OFFERED'].includes(request.status)
    );
    const workerName = candidate.workerProfile?.user?.name ?? 'Worker';

    if (activeRequest) {
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Badge variant="outline">Replacement {activeRequest.status.toLowerCase()}</Badge>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => cancelReplacementMutation.mutate(activeRequest.id)}
            disabled={cancelReplacementMutation.isPending}
          >
            Cancel request
          </Button>
        </div>
      );
    }

    if (['OPEN', 'MATCHING', 'FILLED'].includes(requirement.status)) {
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Stays active until a replacement accepts.
          </p>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            disabled={replacementMutation.isPending}
            onClick={() => {
              const reason = window.prompt(`Why is a replacement needed for ${workerName}?`);
              if (reason?.trim()) replacementMutation.mutate({ candidateId: candidate.id, reason: reason.trim() });
            }}
          >
            Request replacement
          </Button>
        </div>
      );
    }

    return null;
  };

  const sectionProps = {
    onAssign: assignCandidate,
    assigning: assignMutation.isPending,
    navigate,
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-3 px-1 sm:px-0">

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="-ml-2 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* ============================================================
            REQUIREMENT HEADER
        ============================================================ */}

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl sm:text-2xl break-words">
                    {requirement.subCategory?.name ??
                      'Worker Requirement'}
                  </CardTitle>

                  <Badge className={REQUIREMENT_STATUS_STYLES[requirement.status]}>
                    {requirement.status}
                  </Badge>
                </div>

                {requirement.category?.name && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {requirement.category.name}
                  </p>
                )}

              </div>

              <div className="flex flex-wrap gap-2 sm:flex-shrink-0">

                {requirement.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    onClick={() => openMutation.mutate()}
                    disabled={openMutation.isPending}
                  >
                    {openMutation.isPending
                      ? 'Opening…'
                      : 'Open Requirement'}
                  </Button>
                )}

                {['DRAFT', 'OPEN', 'MATCHING', 'EXPIRED'].includes(requirement.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending
                      ? 'Cancelling…'
                      : 'Cancel'}
                  </Button>
                )}

              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* Key facts */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <FactTile icon={MapPin} label="Location">
                {requirement.city}
                {requirement.state ? `, ${requirement.state}` : ''}
              </FactTile>

              <FactTile icon={CalendarDays} label="Joining Date">
                {new Date(requirement.joiningDate).toLocaleDateString()}
              </FactTile>

              <FactTile icon={Users} label="Required Workers">
                {requirement.requiredWorkerCount}
              </FactTile>

              <FactTile icon={Wallet} label="Salary Budget">
                {requirement.salaryBudget != null
                  ? `₹${requirement.salaryBudget}/month`
                  : 'Not specified'}
              </FactTile>
            </div>

            {/* Other details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800 sm:grid-cols-4">
              <RequirementInfo label="Address" className="col-span-2">
                {requirement.address || 'Not specified'}
              </RequirementInfo>

              <RequirementInfo label="Minimum Experience">
                {requirement.minExperience} yr
                {requirement.minExperience === 1 ? '' : 's'}
              </RequirementInfo>

              <RequirementInfo label="Shift Timing">
                {requirement.shiftTiming
                  ? SHIFT_TIMING_LABELS[requirement.shiftTiming] ??
                    requirement.shiftTiming
                  : 'Not specified'}
              </RequirementInfo>

              <RequirementInfo label="Employment Types" className="col-span-2">
                {requirement.employmentTypes.length > 0
                  ? requirement.employmentTypes
                      .map((type) => type.replace(/_/g, ' '))
                      .join(', ')
                  : 'Not specified'}
              </RequirementInfo>

              <RequirementInfo label="Work Mode">
                {requirement.workMode
                  ? requirement.workMode.replace(/_/g, ' ')
                  : 'Not specified'}
              </RequirementInfo>

              <RequirementInfo label="Work Geography">
                {requirement.workGeography
                  ? requirement.workGeography.replace(/_/g, ' ')
                  : 'Not specified'}
              </RequirementInfo>

              {requirement.preferredCountries.length > 0 && (
                <RequirementInfo label="Preferred Countries">
                  {requirement.preferredCountries.join(', ')}
                </RequirementInfo>
              )}

              <RequirementInfo label="Assignment Mode">
                {formatAssignmentMode(requirement.assignmentMode)}
              </RequirementInfo>

              <RequirementInfo label="Backup Pool Size">
                {requirement.backupPoolSize}
              </RequirementInfo>

              {requirement.preferredWorkerProfileId && (
                <RequirementInfo label="Preferred Worker" className="col-span-2">
                  {preferredWorker?.user?.name ??
                    'Preferred worker selected'}
                  {preferredWorker?.experience != null &&
                    ` · ${preferredWorker.experience} years experience`}
                  {(preferredWorker?.city || preferredWorker?.state) &&
                    ` · ${[preferredWorker.city, preferredWorker.state]
                      .filter(Boolean)
                      .join(', ')}`}
                </RequirementInfo>
              )}
            </div>

          </CardContent>
        </Card>

        {/* ============================================================
            MATCHING SUMMARY
        ============================================================ */}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800"
            >
              <p className="text-xs text-neutral-500">{metric.label}</p>
              <p className="mt-0.5 text-xl font-bold leading-tight">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* ============================================================
            MATCHING CONTROLS
        ============================================================ */}

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Find matching workers</p>
                <p className="text-xs text-neutral-500">
                  {candidates.length === 0
                    ? 'No matches yet. Generate matches to find eligible workers.'
                    : `${candidates.length} eligible candidate${candidates.length !== 1 ? 's' : ''} found.`}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <Button
                  size="sm"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => matchMutation.mutate()}
                  disabled={matchMutation.isPending}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      matchMutation.isPending
                        ? 'animate-spin'
                        : ''
                    }`}
                  />

                  {matchMutation.isPending
                    ? 'Finding workers…'
                    : 'Generate Matches'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => poolMutation.mutate()}
                  disabled={
                    poolMutation.isPending ||
                    candidates.length === 0
                  }
                >
                  <Layers className="w-4 h-4" />

                  {poolMutation.isPending
                    ? 'Building pool…'
                    : 'Build Assignment Pool'}
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================
            CONFIRMED ASSIGNMENTS (with replacement controls)
        ============================================================ */}

        <Card>
          <SectionHeader
            icon={CheckCircle2}
            iconClass="bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-300"
            title="Confirmed Assignments"
            count={assignedCandidates.length}
          />
          <CardContent className="space-y-2">
            {assignedCandidates.length === 0 ? (
              <p className="text-sm text-neutral-500">
                None yet. Replacement options appear after a worker accepts an assignment.
              </p>
            ) : (
              assignedCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onAssign={() => undefined}
                  assigning={assignMutation.isPending}
                  navigate={navigate}
                  footer={renderReplacementControls(candidate)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* ============================================================
            OFFERS / PRIMARY / RECOMMENDED / BACKUP / OTHER
        ============================================================ */}

        <CandidateSection
          title="Assignment Offers"
          hint="Waiting for workers to accept."
          icon={UserCheck}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
          candidates={offeredCandidates}
          {...sectionProps}
        />

        <CandidateSection
          title="Primary Matches"
          hint="Best candidates for this requirement."
          icon={UserCheck}
          iconClass="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300"
          candidates={primaryCandidates}
          {...sectionProps}
        />

        <CandidateSection
          title="Recommended Candidates"
          hint="Ranked by match score."
          icon={ShieldCheck}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
          candidates={recommendedCandidates}
          {...sectionProps}
        />

        <CandidateSection
          title="Backup Pool"
          hint="Available if the primary worker cannot continue."
          icon={Layers}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300"
          candidates={backupCandidates}
          {...sectionProps}
        />

        <CandidateSection
          title="Other Candidates"
          candidates={otherCandidates}
          {...sectionProps}
        />

        {/* ============================================================
            REPLACEMENT HISTORY
        ============================================================ */}

        {replacementRequests.length > 0 && (
          <Card>
            <SectionHeader
              title="Replacement History"
              count={replacementRequests.length}
            />
            <CardContent className="space-y-2">
              {replacementRequests.map((request) => (
                <div key={request.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={request.status === 'RESOLVED' ? 'default' : request.status === 'CANCELLED' ? 'secondary' : 'outline'}>{request.status.toLowerCase()}</Badge>
                    <span>{request.currentAssignmentCandidate?.workerProfile.user.name ?? 'Original worker'}</span>
                    {request.replacementCandidate && <span>→ {request.replacementCandidate.workerProfile.user.name}</span>}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{request.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ============================================================
            HOW MATCHING WORKS
        ============================================================ */}

        <div className="flex items-start gap-2 px-1 pb-2 text-xs leading-relaxed text-neutral-500">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <p>
            <span className="font-medium text-neutral-600 dark:text-neutral-300">How matching works: </span>
            Candidates are ranked based on the requirement
            and worker profile. Build the assignment pool to
            organize the best candidates as primary and backup
            workers. Sending an assignment offer does not confirm
            the worker; the assignment is confirmed only after the
            worker accepts.
          </p>
        </div>

      </div>
    </PageLayout>
  );
}


/* ================================================================
   CANDIDATE SECTION
================================================================ */

function CandidateSection({
  title,
  hint,
  icon,
  iconClass,
  candidates,
  onAssign,
  assigning,
  navigate,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  iconClass?: string;
  candidates: RequirementCandidate[];
  onAssign: (candidate: RequirementCandidate) => void;
  assigning: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (candidates.length === 0) return null;

  return (
    <Card>
      <SectionHeader
        icon={icon}
        iconClass={iconClass}
        title={title}
        count={candidates.length}
        hint={hint}
      />
      <CardContent className="space-y-2">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onAssign={() => onAssign(candidate)}
            assigning={assigning}
            navigate={navigate}
          />
        ))}
      </CardContent>
    </Card>
  );
}


/* ================================================================
   CANDIDATE CARD
================================================================ */

function CandidateCard({
  candidate,
  onAssign,
  assigning,
  navigate,
  footer,
}: {
  candidate: RequirementCandidate;
  onAssign: () => void;
  assigning: boolean;
  navigate: ReturnType<typeof useNavigate>;
  footer?: React.ReactNode;
}) {
  const { user } = useAuth();
  const worker = candidate.workerProfile;

  const skillNames = [...(worker?.skills ?? [])]
    .map((skill) => skill.subCategory?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  const canAssign =
    ASSIGNABLE_STATUSES.includes(candidate.status) &&
    !!worker;

  const matchReasons = candidate.matchReason
    ?.split(',')
    .map((reason) => reason.trim())
    .filter(Boolean) ?? [];

  const showProfile = !!worker && user?.role !== 'PARTNER';
  const showActions = showProfile || canAssign;

  return (
    <div
      className={`rounded-lg border border-l-4 border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50 ${STATUS_ACCENT[candidate.status]}`}
    >

      <div className="flex items-start gap-3">

        {/* Avatar */}
        {worker?.profilePhotoUrl ? (
          <img
            src={worker.profilePhotoUrl}
            alt={worker.user?.name ?? 'Worker'}
            className="h-11 w-11 flex-shrink-0 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
          />
        ) : (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <User className="h-5 w-5 text-neutral-400" />
          </div>
        )}

        {/* Worker details */}
        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold break-words">
              {worker?.user?.name ?? 'Unknown worker'}
            </span>
            <Badge className={`text-xs ${STATUS_STYLES[candidate.status]}`}>
              {candidate.status}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            {worker?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {worker.city}
              </span>
            )}
            {worker?.experience != null && (
              <span>{worker.experience} yrs experience</span>
            )}
            {worker?.rating != null && worker.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {worker.rating.toFixed(1)}
              </span>
            )}
            {worker?.isAvailable && (
              <span className="text-green-600 dark:text-green-400">Available</span>
            )}
          </div>

          {skillNames.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skillNames.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skillNames.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{skillNames.length - 4}
                </Badge>
              )}
            </div>
          )}

          {matchReasons.length > 0 && (
            <div className="mt-2.5">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Why matched
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {matchReasons.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-500" />
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(candidate.offeredAt || candidate.acceptedAt || candidate.assignedAt) && (
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              {candidate.offeredAt && (
                <span>Offered: {formatDateTime(candidate.offeredAt)}</span>
              )}
              {candidate.acceptedAt && (
                <span>Accepted: {formatDateTime(candidate.acceptedAt)}</span>
              )}
              {candidate.assignedAt && (
                <span>Assigned: {formatDateTime(candidate.assignedAt)}</span>
              )}
            </div>
          )}

          {candidate.status === 'OFFERED' && (
            <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
              Waiting for the worker to accept this offer.
            </p>
          )}

        </div>

        {/* Match score */}
        <div className={`flex-shrink-0 rounded-lg px-3 py-2 text-center ${scoreTone(candidate.matchScore)}`}>
          <p className="text-lg font-bold leading-none">
            {candidate.matchScore != null
              ? `${candidate.matchScore}%`
              : '—'}
          </p>
          <p className="mt-1 text-xs opacity-80">match</p>
        </div>

      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">

          {showProfile && worker && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() =>
                navigate(`/customer/workers/${worker.id}`)
              }
            >
              View Profile
            </Button>
          )}

          {canAssign && (
            <Button
              size="sm"
              className="w-full gap-1.5 sm:w-auto"
              onClick={onAssign}
              disabled={assigning}
            >
              <UserCheck className="h-3.5 w-3.5" />

              {assigning ? 'Sending offer…' : 'Send Assignment Offer'}
            </Button>
          )}

        </div>
      )}

      {/* Optional footer (used for replacement controls) */}
      {footer && (
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          {footer}
        </div>
      )}

    </div>
  );
}