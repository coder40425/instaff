import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';

import CustomerLayout from '../../layouts/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

import { requirementService, matchingService } from '../../services/api';

import type {
  RequirementCandidate,
  RequirementCandidateStatus,
} from '../../types';

import {
  MapPin,
  Calendar,
  Users,
  IndianRupee,
  Star,
  RefreshCw,
  Layers,
  UserCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ShieldCheck,
  User,
  ArrowLeft,
} from 'lucide-react';

const STATUS_STYLES: Record<RequirementCandidateStatus, string> = {
  RECOMMENDED:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  SHORTLISTED:
    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  PRIMARY:
    'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  BACKUP:
    'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  ASSIGNED:
    'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  REJECTED:
    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  EXPIRED:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
};

const ASSIGNABLE_STATUSES: RequirementCandidateStatus[] = [
  'RECOMMENDED',
  'SHORTLISTED',
  'PRIMARY',
  'BACKUP',
];

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

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent match';
  if (score >= 75) return 'Strong match';
  if (score >= 60) return 'Good match';
  return 'Potential match';
}

export default function RequirementDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      matchingService.assignWorker(id!, workerProfileId),

    onSuccess: () => {
      toast.success('Worker assigned successfully');
      invalidate();
    },

    onError: (e: any) => {
      toast.error(
        e.response?.data?.message || 'Failed to assign worker'
      );
    },
  });

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20 text-neutral-500">
          Loading requirement…
        </div>
      </CustomerLayout>
    );
  }

  if (isError || !requirement) {
    return (
      <CustomerLayout>
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
            onClick={() => navigate('/customer/requirements')}
          >
            Back to Requirements
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const candidates: RequirementCandidate[] = [
    ...(requirement.candidates ?? []),
  ].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const primaryCandidates = candidates.filter(
    (candidate) =>
      candidate.status === 'PRIMARY' ||
      candidate.status === 'ASSIGNED'
  );

  const backupCandidates = candidates.filter(
    (candidate) => candidate.status === 'BACKUP'
  );

  const recommendedCandidates = candidates.filter(
    (candidate) =>
      candidate.status === 'RECOMMENDED' ||
      candidate.status === 'SHORTLISTED'
  );

  const assignedCount = candidates.filter(
    (candidate) => candidate.status === 'ASSIGNED'
  ).length;

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto space-y-6 px-1 sm:px-0">

        {/* Back */}
        <Button
          variant="ghost"
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
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

              <div className="space-y-2">

                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl sm:text-2xl">
                    {requirement.subCategory?.name ??
                      'Worker Requirement'}
                  </CardTitle>

                  <Badge variant="secondary">
                    {requirement.status}
                  </Badge>
                </div>

                {requirement.category?.name && (
                  <p className="text-sm text-neutral-500">
                    {requirement.category.name}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">
                    {formatAssignmentMode(
                      requirement.assignmentMode
                    )}
                  </Badge>

                  {requirement.workMode && (
                    <Badge variant="outline">
                      {requirement.workMode === 'ON_SITE'
                        ? 'On-site'
                        : 'Remote'}
                    </Badge>
                  )}

                  {requirement.workGeography && (
                    <Badge variant="outline">
                      {requirement.workGeography === 'DOMESTIC'
                        ? 'Domestic'
                        : 'International'}
                    </Badge>
                  )}
                </div>

              </div>

              <div className="flex gap-2 flex-shrink-0">

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

                {requirement.status !== 'CANCELLED' &&
                  requirement.status !== 'COMPLETED' && (
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

          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-neutral-500 mt-0.5" />

                <div>
                  <p className="text-xs text-neutral-500">
                    Location
                  </p>

                  <p className="text-sm font-medium">
                    {requirement.city}
                    {requirement.state
                      ? `, ${requirement.state}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-neutral-500 mt-0.5" />

                <div>
                  <p className="text-xs text-neutral-500">
                    Joining Date
                  </p>

                  <p className="text-sm font-medium">
                    {new Date(
                      requirement.joiningDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-neutral-500 mt-0.5" />

                <div>
                  <p className="text-xs text-neutral-500">
                    Workers Needed
                  </p>

                  <p className="text-sm font-medium">
                    {requirement.requiredWorkerCount}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <IndianRupee className="w-4 h-4 text-neutral-500 mt-0.5" />

                <div>
                  <p className="text-xs text-neutral-500">
                    Salary Budget
                  </p>

                  <p className="text-sm font-medium">
                    {requirement.salaryBudget != null
                      ? `₹${requirement.salaryBudget}/month`
                      : 'Not specified'}
                  </p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ============================================================
            MATCHING SUMMARY
        ============================================================ */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">
                Candidates
              </p>

              <p className="text-2xl font-bold mt-1">
                {candidates.length}
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                matched workers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">
                Assigned
              </p>

              <p className="text-2xl font-bold mt-1">
                {assignedCount}
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                of {requirement.requiredWorkerCount} required
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">
                Primary
              </p>

              <p className="text-2xl font-bold mt-1">
                {primaryCandidates.length}
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                recommended primary
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">
                Backups
              </p>

              <p className="text-2xl font-bold mt-1">
                {backupCandidates.length}
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                backup candidates
              </p>
            </CardContent>
          </Card>

        </div>

        {/* ============================================================
            MATCHING CONTROLS
        ============================================================ */}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div>
                <CardTitle className="text-lg">
                  Find Matching Workers
                </CardTitle>

                <p className="text-sm text-neutral-500 mt-1">
                  Generate eligible workers based on the requirement.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">

                <Button
                  variant="outline"
                  className="gap-2"
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
                  variant="outline"
                  className="gap-2"
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
          </CardHeader>

          <CardContent>

            {candidates.length === 0 ? (
              <div className="border border-dashed rounded-xl py-12 text-center">

                <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                  <Users className="w-5 h-5 text-neutral-400" />
                </div>

                <h3 className="font-semibold mt-4">
                  No matching workers yet
                </h3>

                <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
                  Generate matches to find verified and eligible
                  workers for this requirement.
                </p>

                <Button
                  className="mt-4 gap-2"
                  onClick={() => matchMutation.mutate()}
                  disabled={matchMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Matches
                </Button>

              </div>
            ) : (
              <div className="space-y-2 text-sm text-neutral-500">
                <p>
                  {candidates.length} eligible candidate
                  {candidates.length !== 1 ? 's' : ''} found.
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* ============================================================
            PRIMARY / ASSIGNED
        ============================================================ */}

        {primaryCandidates.length > 0 && (
          <Card>

            <CardHeader>
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>

                <div>
                  <CardTitle className="text-lg">
                    Primary Matches
                  </CardTitle>

                  <p className="text-sm text-neutral-500 mt-0.5">
                    Best candidates for this requirement.
                  </p>
                </div>

              </div>
            </CardHeader>

            <CardContent className="space-y-3">

              {primaryCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onAssign={() => {
                    if (candidate.workerProfile) {
                      assignMutation.mutate(
                        candidate.workerProfile.id
                      );
                    }
                  }}
                  assigning={assignMutation.isPending}
                  navigate={navigate}
                />
              ))}

            </CardContent>

          </Card>
        )}

        {/* ============================================================
            RECOMMENDED
        ============================================================ */}

        {recommendedCandidates.length > 0 && (
          <Card>

            <CardHeader>
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                </div>

                <div>
                  <CardTitle className="text-lg">
                    Recommended Candidates
                  </CardTitle>

                  <p className="text-sm text-neutral-500 mt-0.5">
                    Workers ranked according to their match score.
                  </p>
                </div>

              </div>
            </CardHeader>

            <CardContent className="space-y-3">

              {recommendedCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onAssign={() => {
                    if (candidate.workerProfile) {
                      assignMutation.mutate(
                        candidate.workerProfile.id
                      );
                    }
                  }}
                  assigning={assignMutation.isPending}
                  navigate={navigate}
                />
              ))}

            </CardContent>

          </Card>
        )}

        {/* ============================================================
            BACKUP POOL
        ============================================================ */}

        {backupCandidates.length > 0 && (
          <Card>

            <CardHeader>
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                </div>

                <div>
                  <CardTitle className="text-lg">
                    Backup Pool
                  </CardTitle>

                  <p className="text-sm text-neutral-500 mt-0.5">
                    Backup workers available if the primary worker
                    cannot continue.
                  </p>
                </div>

              </div>
            </CardHeader>

            <CardContent className="space-y-3">

              {backupCandidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onAssign={() => {
                    if (candidate.workerProfile) {
                      assignMutation.mutate(
                        candidate.workerProfile.id
                      );
                    }
                  }}
                  assigning={assignMutation.isPending}
                  navigate={navigate}
                />
              ))}

            </CardContent>

          </Card>
        )}

        {/* ============================================================
            ALL OTHER CANDIDATES
        ============================================================ */}

        {candidates.filter(
          (candidate) =>
            ![
              'PRIMARY',
              'ASSIGNED',
              'BACKUP',
              'RECOMMENDED',
              'SHORTLISTED',
            ].includes(candidate.status)
        ).length > 0 && (
          <Card>

            <CardHeader>
              <CardTitle className="text-lg">
                Other Candidates
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">

              {candidates
                .filter(
                  (candidate) =>
                    ![
                      'PRIMARY',
                      'ASSIGNED',
                      'BACKUP',
                      'RECOMMENDED',
                      'SHORTLISTED',
                    ].includes(candidate.status)
                )
                .map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onAssign={() => {
                      if (candidate.workerProfile) {
                        assignMutation.mutate(
                          candidate.workerProfile.id
                        );
                      }
                    }}
                    assigning={assignMutation.isPending}
                    navigate={navigate}
                  />
                ))}

            </CardContent>

          </Card>
        )}

        {/* ============================================================
            ASSIGNMENT INFO
        ============================================================ */}

        <Card className="bg-neutral-50 dark:bg-neutral-900/40">

          <CardContent className="p-5">

            <div className="flex items-start gap-3">

              <CheckCircle2 className="w-5 h-5 text-neutral-600 dark:text-neutral-300 mt-0.5 flex-shrink-0" />

              <div>

                <p className="font-medium text-sm">
                  How matching works
                </p>

                <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                  Candidates are ranked based on the requirement
                  and worker profile. Build the assignment pool to
                  organize the best candidates as primary and backup
                  workers. Assignment is validated again by the
                  server before completion.
                </p>

              </div>

            </div>

          </CardContent>

        </Card>

      </div>
    </CustomerLayout>
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
}: {
  candidate: RequirementCandidate;
  onAssign: () => void;
  assigning: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const worker = candidate.workerProfile;

  const skillNames = [...(worker?.skills ?? [])]
    .map((skill) => skill.subCategory?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  const canAssign =
    ASSIGNABLE_STATUSES.includes(candidate.status) &&
    !!worker;

  const score = Number(candidate.matchScore ?? 0);

  return (
    <div
      className="
        rounded-xl
        border border-neutral-200 dark:border-neutral-800
        p-4
        hover:bg-neutral-50 dark:hover:bg-neutral-900/50
        transition-colors
      "
    >

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">

        {/* Worker */}
        <div className="flex items-start gap-3 min-w-0 flex-1">

          {worker?.profilePhotoUrl ? (
            <img
              src={worker.profilePhotoUrl}
              alt={worker.user?.name ?? 'Worker'}
              className="
                w-12 h-12 rounded-full object-cover
                border border-neutral-200 dark:border-neutral-700
                flex-shrink-0
              "
            />
          ) : (
            <div
              className="
                w-12 h-12 rounded-full
                bg-neutral-100 dark:bg-neutral-800
                flex items-center justify-center
                flex-shrink-0
              "
            >
              <User className="w-5 h-5 text-neutral-400" />
            </div>
          )}

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-2">

              <span className="font-semibold">
                {worker?.user?.name ?? 'Unknown worker'}
              </span>

              <Badge
                className={`text-xs ${STATUS_STYLES[candidate.status]}`}
              >
                {candidate.status}
              </Badge>

            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-neutral-500">

              {worker?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {worker.city}
                </span>
              )}

              {worker?.experience != null && (
                <span>
                  {worker.experience} yrs experience
                </span>
              )}

              {worker?.rating != null && worker.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {worker.rating.toFixed(1)}
                </span>
              )}

              {worker?.isAvailable && (
                <span className="text-green-600 dark:text-green-400">
                  Available
                </span>
              )}

            </div>

            {/* Skills */}
            {skillNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">

                {skillNames.slice(0, 5).map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-xs"
                  >
                    {skill}
                  </Badge>
                ))}

                {skillNames.length > 5 && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    +{skillNames.length - 5}
                  </Badge>
                )}

              </div>
            )}

            {/* Match reason */}
            {candidate.matchReason && (
              <div className="mt-3">
                <p className="text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Why this worker?
                  </span>{' '}
                  {candidate.matchReason}
                </p>
              </div>
            )}

          </div>

        </div>

        {/* Match score */}
        <div className="lg:w-36 flex-shrink-0">

          <div className="flex items-center justify-between lg:justify-center gap-3">

            <div className="text-left lg:text-center">

              <p className="text-xs text-neutral-500">
                Match Score
              </p>

              <p className="text-xl font-bold mt-0.5">
                {score}%
              </p>

              <p className="text-[11px] text-neutral-400">
                {getScoreLabel(score)}
              </p>

            </div>

          </div>

        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">

          {worker && (
            <Button
              variant="outline"
              size="sm"
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
              className="gap-1.5"
              onClick={onAssign}
              disabled={assigning}
            >
              <UserCheck className="w-3.5 h-3.5" />

              {assigning ? 'Assigning…' : 'Assign'}
            </Button>
          )}

        </div>

      </div>

    </div>
  );
}