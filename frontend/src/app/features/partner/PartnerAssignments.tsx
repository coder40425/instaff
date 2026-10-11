import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import PartnerLayout from '../../layouts/PartnerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { PartnerAssignmentCard, isTrackedPartnerCandidate } from '../../components/ui/partner/PartnerAssignmentCard';
import type { TrackedPartnerCandidate } from '../../components/ui/partner/PartnerAssignmentCard';
import { partnerService } from '../../services/partnerApi';
import { requirementService } from '../../services/api';

export default function PartnerAssignments() {
  const profileQuery = useQuery({ queryKey: ['partner-profile'], queryFn: partnerService.getProfile });
  const requirementsQuery = useQuery({
    queryKey: ['partner-requirements'],
    queryFn: requirementService.getMy,
    enabled: profileQuery.data?.status === 'APPROVED',
  });

  const error = (profileQuery.error as any)?.response?.data?.message
    || (requirementsQuery.error as any)?.response?.data?.message
    || (profileQuery.error as Error | null)?.message
    || (requirementsQuery.error as Error | null)?.message;

  const requirements = requirementsQuery.data ?? [];
  const assignments: TrackedPartnerCandidate[] = requirements.flatMap((requirement) => {
    const replacedCandidateIds = new Set(
      (requirement.replacementRequests ?? [])
        .filter((request) => request.status === 'RESOLVED')
        .map((request) => request.currentAssignmentCandidateId)
    );

    return (requirement.candidates ?? []).filter(
      (candidate): candidate is TrackedPartnerCandidate => {
        if (!isTrackedPartnerCandidate(candidate)) return false;

        return candidate.status === 'REJECTED' ||
          (candidate.status === 'OFFERED' && ['OPEN', 'MATCHING', 'FILLED'].includes(requirement.status)) ||
          (candidate.status === 'ASSIGNED' &&
            ['OPEN', 'MATCHING', 'FILLED'].includes(requirement.status) &&
            !replacedCandidateIds.has(candidate.id));
      }
    )
      .map((candidate) => ({ ...candidate, requirement }))
  });
  const replacementRequests = requirements.flatMap((requirement) =>
    (requirement.replacementRequests ?? []).map((request) => ({ request, requirement }))
  ).sort((left, right) => new Date(right.request.createdAt).getTime() - new Date(left.request.createdAt).getTime());

  const replacementStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Open';
      case 'OFFERED': return 'Offer awaiting response';
      case 'RESOLVED': return 'Resolved';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Assignments</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Track offers and worker responses for your client requirements.
          </p>
        </div>

        {profileQuery.isLoading ? (
          <Card><CardContent className="py-10 text-center text-neutral-500">Checking Partner approval…</CardContent></Card>
        ) : profileQuery.isError || !profileQuery.data ? (
          <Card className="border-red-200 dark:border-red-900"><CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{error || 'Unable to load Partner profile.'}</p>
            <Button variant="outline" onClick={() => profileQuery.refetch()}>Retry</Button>
          </CardContent></Card>
        ) : profileQuery.data.status !== 'APPROVED' ? (
          <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"><CardContent className="flex items-center gap-3 p-5">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">Assignments are unavailable until approval.</p><PartnerStatusBadge status={profileQuery.data.status} /></div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Worker offers and acceptance tracking require an approved Partner account.</p>
            </div>
          </CardContent></Card>
        ) : requirementsQuery.isLoading ? (
          <Card><CardContent className="py-10 text-center text-neutral-500">Loading assignments…</CardContent></Card>
        ) : requirementsQuery.isError ? (
          <Card className="border-red-200 dark:border-red-900"><CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{error || 'Unable to load assignments.'}</p>
            <Button variant="outline" onClick={() => requirementsQuery.refetch()}>Retry</Button>
          </CardContent></Card>
        ) : assignments.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-14 text-center">
            <CheckCircle2 className="h-9 w-9 text-neutral-300 dark:text-neutral-700" />
            <h2 className="mt-4 font-semibold">No worker offers yet</h2>
            <p className="mt-1 max-w-md text-sm text-neutral-500">Offers, accepted assignments, and worker rejections will appear here from your requirement workflow.</p>
            <Button asChild variant="outline" className="mt-5"><Link to="/partner/requirements">View requirements</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => <PartnerAssignmentCard key={assignment.id} assignment={assignment} />)}
          </div>
        )}

        {!profileQuery.isLoading && !profileQuery.isError && profileQuery.data?.status === 'APPROVED' && !requirementsQuery.isLoading && !requirementsQuery.isError && (
          <section id="replacement-requests" className="scroll-mt-24 space-y-3" aria-labelledby="replacement-requests-heading">
            <div>
              <h2 id="replacement-requests-heading" className="text-lg font-semibold">Replacement requests</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Current requests and their recorded history for your requirements.</p>
            </div>
            {replacementRequests.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-neutral-500">No replacement requests yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {replacementRequests.map(({ request, requirement }) => (
                  <Card key={request.id}>
                    <CardContent className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{replacementStatusLabel(request.status)}</Badge>
                          <span className="text-sm font-medium">{request.currentAssignmentCandidate?.workerProfile.user.name ?? 'Original worker'}</span>
                          {request.replacementCandidate && (
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              <ArrowRight className="mx-1 inline h-3.5 w-3.5" />{request.replacementCandidate.workerProfile.user.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {requirement.subCategory?.name || requirement.category?.name || 'Worker requirement'}
                          {' · '}{[requirement.city, requirement.state].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-sm">{request.reason}</p>
                        {request.status === 'OFFERED' && (
                          <p className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300">
                            <Clock3 className="h-4 w-4" /> Waiting for the replacement worker to respond.
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                          <RefreshCw className="h-3.5 w-3.5" />{new Date(request.createdAt).toLocaleDateString('en-IN')}
                        </span>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/partner/requirements/${requirement.id}`}>View requirement <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </PartnerLayout>
  );
}
