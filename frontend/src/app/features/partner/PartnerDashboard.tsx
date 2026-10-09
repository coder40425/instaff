import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, BriefcaseBusiness, UsersRound } from 'lucide-react';
import PartnerLayout from '../../layouts/PartnerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { formatPartnerType } from '../../components/ui/partner/partnerFormatting';
import { partnerService } from '../../services/partnerApi';
import { useAuth } from '../../hooks/useAuth';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { data: profile, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['partner-profile'],
    queryFn: partnerService.getProfile,
  });

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Partner workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Manage your workforce and client requirements.
          </p>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading Partner profile…</CardContent></Card>
        ) : isError || !profile ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium">Unable to load your Partner profile</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {(error as any)?.response?.data?.message || (error as Error)?.message || 'Please try again.'}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {profile.status !== 'APPROVED' && (
              <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Partner approval required</p>
                      <PartnerStatusBadge status={profile.status} />
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      Worker management and requirement operations will be available after your account is approved.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Partner type</CardTitle>
                  <BriefcaseBusiness className="h-4 w-4 text-neutral-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">{formatPartnerType(profile.partnerType)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Approval status</CardTitle>
                </CardHeader>
                <CardContent><PartnerStatusBadge status={profile.status} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Associated workers</CardTitle>
                  <UsersRound className="h-4 w-4 text-neutral-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {profile.workerCount} <span className="text-base font-medium text-neutral-500">/ {profile.workerLimit ?? 'Unlimited'}</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Remaining capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {profile.workerLimit === null ? 'Unlimited' : Math.max(0, profile.workerLimit - profile.workerCount)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">My workers</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">View and manage workers associated with your Partner profile.</p>
                  {profile.status === 'APPROVED' ? (
                    <Button asChild variant="outline">
                      <Link to="/partner/workers">Open workers <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>Available after approval</Button>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Client requirements</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Create a requirement and follow its matching and assignment progress.</p>
                  {profile.status === 'APPROVED' ? (
                    <Button asChild variant="outline">
                      <Link to="/partner/requirements">View requirements <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>Available after approval</Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PartnerLayout>
  );
}
