import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import PartnerLayout from '../../layouts/PartnerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
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

  const assignments: TrackedPartnerCandidate[] = (requirementsQuery.data ?? []).flatMap((requirement) =>
    (requirement.candidates ?? [])
      .filter(isTrackedPartnerCandidate)
      .map((candidate) => ({ ...candidate, requirement }))
  );

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
      </div>
    </PartnerLayout>
  );
}
