import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { toast } from 'sonner';
import WorkerLayout from '../../layouts/WorkerLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { workerService } from '../../services/api';
import type { WorkerRequirementOffer } from '../../types';
import { BriefcaseBusiness, Building2, CalendarDays, Clock3, IndianRupee, MapPin, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const QUERY_KEY = ['worker-requirement-offers'];

const canRespond = (offer: WorkerRequirementOffer) =>
  offer.status === 'OFFERED' &&
  (['OPEN', 'MATCHING'].includes(offer.requirement.status) ||
    (Boolean(offer.replacementRequest) && offer.requirement.status === 'FILLED'));

const displayStatus = (offer: WorkerRequirementOffer) => {
  if (offer.isReplaced) return 'REPLACED';
  if (
    offer.status === 'ASSIGNED' &&
    ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(offer.requirement.status)
  ) {
    return offer.requirement.status;
  }
  return offer.status;
};

const badgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'ASSIGNED' || status === 'COMPLETED') return 'default';
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') return 'destructive';
  if (status === 'OFFERED') return 'outline';
  return 'secondary';
};

const formatLabel = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const locationLabel = (offer: WorkerRequirementOffer) =>
  [offer.requirement.address, offer.requirement.city, offer.requirement.state]
    .filter(Boolean)
    .join(', ');

const companyLabel = (offer: WorkerRequirementOffer) =>
  offer.companyName || (offer.requirement.source === 'PARTNER_CLIENT'
    ? offer.requirement.partner?.displayName || 'Partner'
    : 'NearPassway');

function OpportunityDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/70">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function RequirementCard({
  offer,
  onOpen,
}: {
  offer: WorkerRequirementOffer;
  onOpen: () => void;
}) {
  const requirement = offer.requirement;
  const salary = requirement.salaryBudget == null
    ? null
    : `₹${requirement.salaryBudget.toLocaleString('en-IN')}/month`;
  const joiningDate = formatDate(requirement.joiningDate);
  const matchScore = offer.matchScore == null ? null : `${offer.matchScore} points`;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="break-words font-semibold">
              {requirement.category.name} · {requirement.subCategory.name}
            </p>
            <Badge variant="outline" className="mt-1">
              {requirement.businessModel === 'REGULAR_EMPLOYMENT'
                ? 'Regular Employment – Staff Hiring'
                : requirement.businessModel === 'BULK_MANPOWER'
                  ? 'Bulk Manpower – Team Hiring'
                  : 'Gig Work – Service Booking'}
            </Badge>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{companyLabel(offer)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={badgeVariant(displayStatus(offer))}>
            {displayStatus(offer).replace(/_/g, ' ')}
          </Badge>
          <Button size="sm" variant="outline" onClick={onOpen}>View details</Button>
        </div>
      </div>

      <div className="grid gap-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800 sm:grid-cols-2 lg:grid-cols-3 sm:px-5">
        <OpportunityDetail icon={MapPin} label="Work location" value={locationLabel(offer)} />
        <OpportunityDetail icon={IndianRupee} label="Monthly budget" value={salary} />
        <OpportunityDetail icon={BriefcaseBusiness} label="Employment type" value={requirement.employmentTypes.length
          ? requirement.employmentTypes.map(formatLabel).join(', ')
          : null} />
        <OpportunityDetail icon={Clock3} label="Shift" value={requirement.shiftTiming ? formatLabel(requirement.shiftTiming) : null} />
        <OpportunityDetail icon={CalendarDays} label="Joining date" value={joiningDate} />
        <OpportunityDetail icon={Target} label="Match score" value={matchScore} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-800 sm:px-5">
        <span>{requirement.minExperience} years minimum experience</span>
        {requirement.workMode && <span>{formatLabel(requirement.workMode)}</span>}
        {requirement.workGeography && <span>{formatLabel(requirement.workGeography)} work area</span>}
        {offer.replacementRequest && (
          <span className="font-medium text-amber-700 dark:text-amber-300">
            Replacement offer
          </span>
        )}
      </div>
    </div>
  );
}

export default function WorkerRequirements() {
  const queryClient = useQueryClient();
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const offersQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: workerService.getRequirementOffers,
  });
  const offers = offersQuery.data ?? [];
  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) ?? null;

  const responseMutation = useMutation({
    mutationFn: ({ candidateId, decision }: { candidateId: string; decision: 'accept' | 'reject' }) =>
      decision === 'accept'
        ? workerService.acceptRequirementOffer(candidateId)
        : workerService.rejectRequirementOffer(candidateId),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData<WorkerRequirementOffer[]>(QUERY_KEY, (current) =>
        current?.map((offer) => offer.id === result.id
          ? {
              ...offer,
              status: result.status,
              acceptedAt: result.acceptedAt,
              assignedAt: result.assignedAt,
              rejectedAt: result.rejectedAt,
            }
          : offer)
      );
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (result.status === 'ASSIGNED') {
        await queryClient.invalidateQueries({ queryKey: ['worker-profile'] });
      }
      setSelectedOfferId(null);
      toast.success(variables.decision === 'accept' ? 'Requirement offer accepted' : 'Requirement offer rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to update this requirement offer');
    },
  });

  const pendingOffers = offers.filter(canRespond);
  const assignments = offers.filter((offer) =>
    offer.status === 'ASSIGNED' &&
    !offer.isReplaced &&
    ['OPEN', 'MATCHING', 'FILLED'].includes(offer.requirement.status)
  );
  const previousOffers = offers.filter((offer) =>
    offer.status === 'REJECTED' ||
    offer.status === 'EXPIRED' ||
    offer.isReplaced ||
    (offer.status === 'ASSIGNED' && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(offer.requirement.status)) ||
    (offer.status === 'OFFERED' && !canRespond(offer))
  );

  const renderOfferList = (
    list: WorkerRequirementOffer[],
    emptyMessage: string
  ) => list.length === 0 ? (
    <p className="py-3 text-sm text-neutral-500">{emptyMessage}</p>
  ) : (
    <div className="space-y-3">
      {list.map((offer) => (
        <RequirementCard key={offer.id} offer={offer} onOpen={() => setSelectedOfferId(offer.id)} />
      ))}
    </div>
  );

  return (
    <WorkerLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">My Requirements</h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Review offers and track confirmed requirement assignments.
            </p>
          </div>
          <Button asChild variant="outline"><Link to="/worker">Dashboard</Link></Button>
        </div>

        {offersQuery.isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading requirements…</CardContent></Card>
        ) : offersQuery.isError ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-red-600">Unable to load your requirements.</p>
              <Button variant="outline" onClick={() => offersQuery.refetch()} disabled={offersQuery.isFetching}>
                {offersQuery.isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>Pending Offers</CardTitle></CardHeader>
              <CardContent>
                {renderOfferList(pendingOffers, 'No pending requirement offers.')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Confirmed Assignments</CardTitle></CardHeader>
              <CardContent>
                {renderOfferList(assignments, 'No confirmed requirement assignments yet.')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Previous Offers</CardTitle></CardHeader>
              <CardContent>
                {renderOfferList(previousOffers, 'No rejected or expired offers.')}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={!!selectedOffer} onOpenChange={(open) => { if (!open) setSelectedOfferId(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            {selectedOffer && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedOffer.requirement.category.name} · {selectedOffer.requirement.subCategory.name}
                  </DialogTitle>
                </DialogHeader>
                <Badge variant="outline" className="w-fit">
                  {selectedOffer.requirement.businessModel === 'REGULAR_EMPLOYMENT'
                    ? 'Regular Employment – Staff Hiring'
                    : selectedOffer.requirement.businessModel === 'BULK_MANPOWER'
                      ? 'Bulk Manpower – Team Hiring'
                      : 'Gig Work – Service Booking'}
                </Badge>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                      <Building2 className="h-4 w-4 text-neutral-500" />
                      {companyLabel(selectedOffer)}
                    </p>
                    <Badge variant={badgeVariant(displayStatus(selectedOffer))}>
                      {displayStatus(selectedOffer).replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 sm:grid-cols-[1fr_1.5fr]">
                    {selectedOffer.requirement.salaryBudget != null && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-800/70 dark:text-blue-200/70">Monthly budget</p>
                        <p className="mt-1 text-2xl font-bold text-blue-950 dark:text-blue-100">
                          ₹{selectedOffer.requirement.salaryBudget.toLocaleString('en-IN')}
                          <span className="ml-1 text-sm font-medium">/month</span>
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-800/70 dark:text-blue-200/70">Work location</p>
                      <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-blue-950 dark:text-blue-100">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="break-words">{locationLabel(selectedOffer) || 'Location not specified'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <OpportunityDetail icon={BriefcaseBusiness} label="Employment type" value={selectedOffer.requirement.employmentTypes.length
                      ? selectedOffer.requirement.employmentTypes.map(formatLabel).join(', ')
                      : null} />
                    <OpportunityDetail icon={BriefcaseBusiness} label="Work mode" value={selectedOffer.requirement.workMode
                      ? formatLabel(selectedOffer.requirement.workMode)
                      : null} />
                    <OpportunityDetail icon={Clock3} label="Shift" value={selectedOffer.requirement.shiftTiming
                      ? formatLabel(selectedOffer.requirement.shiftTiming)
                      : null} />
                    <OpportunityDetail icon={CalendarDays} label="Joining date" value={formatDate(selectedOffer.requirement.joiningDate)} />
                    <OpportunityDetail icon={Target} label="Minimum experience" value={`${selectedOffer.requirement.minExperience} years`} />
                    <OpportunityDetail icon={Building2} label="Workers needed" value={`${selectedOffer.requirement.requiredWorkerCount}`} />
                    <OpportunityDetail icon={BriefcaseBusiness} label="Work geography" value={selectedOffer.requirement.workGeography
                      ? formatLabel(selectedOffer.requirement.workGeography)
                      : null} />
                    <OpportunityDetail icon={Target} label="Match score" value={selectedOffer.matchScore == null
                      ? null
                      : `${selectedOffer.matchScore} points`} />
                  </div>

                  {selectedOffer.matchReason && (
                    <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                      <p className="font-medium">Matching details</p>
                      <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                        {selectedOffer.matchReason.split(',').map((reason) => reason.trim()).filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  )}

                  {selectedOffer.replacementRequest && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
                      <p className="font-medium">Replacement assignment</p>
                      <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                        This offer replaces {selectedOffer.replacementRequest.originalWorkerName}.
                      </p>
                      <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                        Reason: {selectedOffer.replacementRequest.reason}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-neutral-500">
                    {formatDate(selectedOffer.offeredAt) && <p>Offered: {new Date(selectedOffer.offeredAt!).toLocaleString()}</p>}
                    {formatDate(selectedOffer.acceptedAt) && <p>Accepted: {new Date(selectedOffer.acceptedAt!).toLocaleString()}</p>}
                    {formatDate(selectedOffer.assignedAt) && <p>Assigned: {new Date(selectedOffer.assignedAt!).toLocaleString()}</p>}
                    {formatDate(selectedOffer.rejectedAt) && <p>Rejected: {new Date(selectedOffer.rejectedAt!).toLocaleString()}</p>}
                  </div>

                  {selectedOffer.status === 'OFFERED' && !canRespond(selectedOffer) && (
                    <p className="text-sm text-neutral-500">
                      This requirement is {selectedOffer.requirement.status.toLowerCase().replace(/_/g, ' ')}; the offer is no longer available.
                    </p>
                  )}

                  {canRespond(selectedOffer) && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                      <Button
                        variant="outline"
                        onClick={() => responseMutation.mutate({ candidateId: selectedOffer.id, decision: 'reject' })}
                        disabled={responseMutation.isPending}
                      >
                        {responseMutation.isPending && responseMutation.variables?.decision === 'reject' ? 'Rejecting…' : 'Reject'}
                      </Button>
                      <Button
                        onClick={() => responseMutation.mutate({ candidateId: selectedOffer.id, decision: 'accept' })}
                        disabled={responseMutation.isPending}
                      >
                        {responseMutation.isPending && responseMutation.variables?.decision === 'accept' ? 'Accepting…' : 'Accept'}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </WorkerLayout>
  );
}
