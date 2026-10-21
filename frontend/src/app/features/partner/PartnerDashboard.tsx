import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2,
  ClipboardList, Clock3, CreditCard, DollarSign, RefreshCw, Star, UserRoundCheck,
  UsersRound, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PartnerLayout from '../../layouts/PartnerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { formatPartnerType } from '../../components/ui/partner/partnerFormatting';
import { partnerService } from '../../services/partnerApi';
import { useAuth } from '../../hooks/useAuth';

function MetricCard({
  title,
  value,
  icon: Icon,
  detail,
}: {
  title: string;
  value: number | string | null;
  icon: LucideIcon;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</CardTitle>
        <Icon className="h-4 w-4 text-neutral-500" />
      </CardHeader>
      <CardContent>
        <p className={value === null ? 'text-sm font-medium text-neutral-500 dark:text-neutral-400' : 'text-2xl font-bold tabular-nums'}>
          {value === null ? 'Not available yet' : value}
        </p>
        {detail && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{detail}</p>}
      </CardContent>
    </Card>
  );
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const profileQuery = useQuery({
    queryKey: ['partner-profile'],
    queryFn: partnerService.getProfile,
  });
  const profile = profileQuery.data;
  const summaryQuery = useQuery({
    queryKey: ['partner-dashboard-summary'],
    queryFn: partnerService.getDashboardSummary,
    enabled: profile?.status === 'APPROVED',
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

        {profileQuery.isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading Partner profile…</CardContent></Card>
        ) : profileQuery.isError || !profile ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium">Unable to load your Partner profile</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {(profileQuery.error as any)?.response?.data?.message || (profileQuery.error as Error)?.message || 'Please try again.'}
                </p>
              </div>
              <Button variant="outline" onClick={() => profileQuery.refetch()} disabled={profileQuery.isFetching}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {profile.status !== 'APPROVED' && (
              <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Partner approval required</p>
                      <PartnerStatusBadge status={profile.status} />
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      Workforce and requirement operations will be available after your account is approved.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <section className="space-y-3" aria-labelledby="partner-profile-heading">
              <h2 id="partner-profile-heading" className="text-lg font-semibold">Partner profile</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Partner type</CardTitle>
                    <BriefcaseBusiness className="h-4 w-4 text-neutral-500" />
                  </CardHeader>
                  <CardContent><p className="text-xl font-semibold">{formatPartnerType(profile.partnerType)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Approval status</CardTitle></CardHeader>
                  <CardContent><PartnerStatusBadge status={profile.status} /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Associated workers</CardTitle>
                    <UsersRound className="h-4 w-4 text-neutral-500" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {profile.workerCount} <span className="text-base font-medium text-neutral-500">/ {profile.workerLimit ?? 'Unlimited'}</span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Remaining capacity</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{profile.workerLimit === null ? 'Unlimited' : Math.max(0, profile.workerLimit - profile.workerCount)}</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {profile.status === 'APPROVED' && (
              <>
                {summaryQuery.isLoading ? (
                  <Card><CardContent className="py-10 text-center text-neutral-500">Loading workforce and assignment metrics…</CardContent></Card>
                ) : summaryQuery.isError || !summaryQuery.data ? (
                  <Card className="border-red-200 dark:border-red-900">
                    <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {(summaryQuery.error as any)?.response?.data?.message || (summaryQuery.error as Error)?.message || 'Unable to load dashboard metrics.'}
                      </p>
                      <Button variant="outline" onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching}>Retry metrics</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <section className="space-y-3" aria-labelledby="business-overview-heading">
                      <div>
                        <h2 id="business-overview-heading" className="text-lg font-semibold">Business overview</h2>
                        <p className="text-sm text-neutral-500">Financial tracking is not yet available for Partner accounts.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <MetricCard title="Today's Revenue" value={summaryQuery.data.businessOverview.todayRevenue} icon={DollarSign} />
                        <MetricCard title="Monthly Revenue" value={summaryQuery.data.businessOverview.monthlyRevenue} icon={DollarSign} />
                        <MetricCard title="Commission" value={summaryQuery.data.businessOverview.commission} icon={DollarSign} />
                        <MetricCard title="Wallet Balance" value={summaryQuery.data.businessOverview.walletBalance} icon={Wallet} />
                        <MetricCard title="Pending Payments" value={summaryQuery.data.businessOverview.pendingPayments} icon={CreditCard} />
                        <MetricCard
                          title="Replacement Requests"
                          value={summaryQuery.data.assignments.openReplacementRequests}
                          icon={RefreshCw}
                          detail="Open or offered replacement"
                        />
                        <MetricCard
                          title="Average rating of associated workers"
                          value={summaryQuery.data.businessOverview.averageAssociatedWorkerRating === null
                            ? null
                            : `${summaryQuery.data.businessOverview.averageAssociatedWorkerRating.toFixed(1)} / 5`}
                          icon={Star}
                          detail={summaryQuery.data.businessOverview.associatedWorkerReviewCount > 0
                            ? `Based on ${summaryQuery.data.businessOverview.associatedWorkerReviewCount} customer reviews`
                            : 'No customer reviews for currently associated workers'}
                        />
                      </div>
                    </section>

                    <section className="space-y-3" aria-labelledby="workforce-overview-heading">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 id="workforce-overview-heading" className="text-lg font-semibold">Workforce overview</h2>
                          <p className="text-sm text-neutral-500">Operational status from your associated workers.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching}>
                          <RefreshCw className={'mr-2 h-4 w-4 ' + (summaryQuery.isFetching ? 'animate-spin' : '')} />Refresh metrics
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <MetricCard title="Total workers" value={summaryQuery.data.workforce.total} icon={UsersRound} />
                        <MetricCard title="Available" value={summaryQuery.data.workforce.available} icon={UserRoundCheck} detail="Verified and free of active assignments" />
                        <MetricCard title="Busy" value={summaryQuery.data.workforce.busy} icon={Clock3} detail="Has an active confirmed assignment" />
                        <MetricCard title="On duty" value={summaryQuery.data.workforce.onDuty} icon={CheckCircle2} detail="Booking has started and is in progress" />
                        <MetricCard title="Verification pending" value={summaryQuery.data.workforce.verificationPending} icon={AlertCircle} />
                      </div>
                    </section>

                    <section className="space-y-3" aria-labelledby="assignment-overview-heading">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h2 id="assignment-overview-heading" className="text-lg font-semibold">Assignment overview</h2>
                          <p className="text-sm text-neutral-500">Counts from requirements created by your Partner account.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to="/partner/assignments">View assignments <ArrowRight className="ml-2 h-4 w-4" /></Link>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link to="/partner/assignments#replacement-requests">Track replacements <ArrowRight className="ml-2 h-4 w-4" /></Link>
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <MetricCard title="Open requirements" value={summaryQuery.data.assignments.openRequirements} icon={ClipboardList} detail="Open or matching" />
                        <MetricCard title="Pending offers" value={summaryQuery.data.assignments.pendingOffers} icon={Clock3} detail="Awaiting a worker response" />
                        <MetricCard title="Confirmed assignments" value={summaryQuery.data.assignments.confirmedAssignments} icon={CheckCircle2} detail="Active assignments accepted by workers" />
                        <MetricCard title="Upcoming assignments" value={summaryQuery.data.assignments.upcomingAssignments} icon={CalendarClock} detail="Confirmed with a future joining date" />
                        <MetricCard title="Open replacements" value={summaryQuery.data.assignments.openReplacementRequests} icon={RefreshCw} detail="Open or offered replacement" />
                      </div>
                    </section>
                  </>
                )}
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">My workers</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">View and manage workers associated with your Partner profile.</p>
                  {profile.status === 'APPROVED' ? (
                    <Button asChild variant="outline"><Link to="/partner/workers">Open workers <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  ) : <Button variant="outline" disabled>Available after approval</Button>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Client requirements</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Create a requirement and follow its matching and assignment progress.</p>
                  {profile.status === 'APPROVED' ? (
                    <Button asChild variant="outline"><Link to="/partner/requirements">View requirements <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  ) : <Button variant="outline" disabled>Available after approval</Button>}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PartnerLayout>
  );
}
