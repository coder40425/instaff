import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ClipboardList } from 'lucide-react';
import PartnerLayout from '../../layouts/PartnerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { PartnerRequirementCard } from '../../components/ui/partner/PartnerRequirementCard';
import { partnerService } from '../../services/partnerApi';
import { requirementService } from '../../services/api';

export default function PartnerRequirements() {
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

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Client requirements</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Requirements created from your Partner account.</p>
          </div>
          {profileQuery.data?.status === 'APPROVED' && (
            <Button asChild><Link to="/partner/requirements/create">Create requirement</Link></Button>
          )}
        </div>

        {profileQuery.isLoading ? (
          <Card><CardContent className="py-10 text-center text-neutral-500">Checking Partner approval…</CardContent></Card>
        ) : profileQuery.isError || !profileQuery.data ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{error || 'Unable to load Partner profile.'}</p>
              <Button variant="outline" onClick={() => profileQuery.refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : profileQuery.data.status !== 'APPROVED' ? (
          <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Requirement operations are unavailable until Partner approval.</p>
                  <PartnerStatusBadge status={profileQuery.data.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Your profile remains available while approval is pending.</p>
              </div>
            </CardContent>
          </Card>
        ) : requirementsQuery.isLoading ? (
          <Card><CardContent className="py-10 text-center text-neutral-500">Loading requirements…</CardContent></Card>
        ) : requirementsQuery.isError ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{error || 'Unable to load requirements.'}</p>
              <Button variant="outline" onClick={() => requirementsQuery.refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : !requirementsQuery.data?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-14 text-center">
              <ClipboardList className="h-9 w-9 text-neutral-300 dark:text-neutral-700" />
              <h2 className="mt-4 font-semibold">No client requirements yet</h2>
              <p className="mt-1 max-w-md text-sm text-neutral-500">Create a requirement to start the existing NearPassway matching and assignment workflow.</p>
              <Button asChild className="mt-5"><Link to="/partner/requirements/create">Create requirement</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requirementsQuery.data.map((requirement) => <PartnerRequirementCard key={requirement.id} requirement={requirement} />)}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
