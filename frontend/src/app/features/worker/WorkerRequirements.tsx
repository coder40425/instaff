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

function RequirementCard({
  offer,
  onOpen,
}: {
  offer: WorkerRequirementOffer;
  onOpen: () => void;
}) {
  const partner = offer.requirement.partner;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="min-w-0">
        <p className="font-semibold">
          {offer.requirement.category.name} · {offer.requirement.subCategory.name}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {offer.requirement.source === 'PARTNER_CLIENT'
            ? `Partner${partner?.displayName ? ` · ${partner.displayName}` : ''}`
            : 'NearPassway'}
          {' · '}
          {[offer.requirement.city, offer.requirement.state].filter(Boolean).join(', ')}
        </p>
        {offer.replacementRequest && (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            Replacement offer for {offer.replacementRequest.originalWorkerName}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={badgeVariant(displayStatus(offer))}>
          {displayStatus(offer).replace(/_/g, ' ')}
        </Badge>
        <Button size="sm" variant="outline" onClick={onOpen}>View details</Button>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            {selectedOffer && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedOffer.requirement.category.name} · {selectedOffer.requirement.subCategory.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-neutral-500">
                      {selectedOffer.requirement.source === 'PARTNER_CLIENT'
                        ? `Partner${selectedOffer.requirement.partner?.displayName ? ` · ${selectedOffer.requirement.partner.displayName}` : ''}`
                        : 'NearPassway'}
                    </p>
                    <Badge variant={badgeVariant(displayStatus(selectedOffer))}>
                      {displayStatus(selectedOffer).replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <p><span className="text-neutral-500">Location:</span> {[selectedOffer.requirement.city, selectedOffer.requirement.state].filter(Boolean).join(', ')}</p>
                    <p><span className="text-neutral-500">Joining:</span> {new Date(selectedOffer.requirement.joiningDate).toLocaleDateString()}</p>
                    <p><span className="text-neutral-500">Minimum experience:</span> {selectedOffer.requirement.minExperience} years</p>
                    <p><span className="text-neutral-500">Workers needed:</span> {selectedOffer.requirement.requiredWorkerCount}</p>
                    {selectedOffer.requirement.shiftTiming && (
                      <p><span className="text-neutral-500">Shift:</span> {selectedOffer.requirement.shiftTiming.replace(/_/g, ' ')}</p>
                    )}
                    {selectedOffer.requirement.salaryBudget != null && (
                      <p><span className="text-neutral-500">Budget:</span> ₹{selectedOffer.requirement.salaryBudget}/month</p>
                    )}
                    {selectedOffer.requirement.employmentTypes.length > 0 && (
                      <p><span className="text-neutral-500">Employment:</span> {selectedOffer.requirement.employmentTypes.map((type) => type.replace(/_/g, ' ').toLowerCase()).join(', ')}</p>
                    )}
                    {selectedOffer.requirement.workMode && (
                      <p><span className="text-neutral-500">Work mode:</span> {selectedOffer.requirement.workMode.replace(/_/g, ' ')}</p>
                    )}
                    {selectedOffer.requirement.workGeography && (
                      <p><span className="text-neutral-500">Service area:</span> {selectedOffer.requirement.workGeography.toLowerCase()}</p>
                    )}
                  </div>

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
                    {selectedOffer.offeredAt && <p>Offered: {new Date(selectedOffer.offeredAt).toLocaleString()}</p>}
                    {selectedOffer.acceptedAt && <p>Accepted: {new Date(selectedOffer.acceptedAt).toLocaleString()}</p>}
                    {selectedOffer.assignedAt && <p>Assigned: {new Date(selectedOffer.assignedAt).toLocaleString()}</p>}
                    {selectedOffer.rejectedAt && <p>Rejected: {new Date(selectedOffer.rejectedAt).toLocaleString()}</p>}
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
