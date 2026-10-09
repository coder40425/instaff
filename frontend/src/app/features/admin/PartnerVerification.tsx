import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { formatPartnerType } from '../../components/ui/partner/partnerFormatting';
import { adminService } from '../../services/api';
import type { AdminPartnerProfile } from '../../types/partner';
import { toast } from 'sonner';

type PartnerAdminAction = 'approve' | 'reject' | 'suspend' | 'reactivate';
type PendingPartnerAction = { partner: AdminPartnerProfile; action: PartnerAdminAction };

const actionLabels: Record<PartnerAdminAction, string> = {
  approve: 'Approve Partner',
  reject: 'Reject Partner',
  suspend: 'Suspend Partner',
  reactivate: 'Reactivate Partner',
};

const actionVerbs: Record<PartnerAdminAction, string> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  reactivate: 'reactivated',
};

export default function PartnerVerification() {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingPartnerAction | null>(null);

  const pendingPartnersQuery = useQuery({
    queryKey: ['admin-pending-partners'],
    queryFn: adminService.getPendingPartners,
  });

  const partnersQuery = useQuery({
    queryKey: ['admin-partners'],
    queryFn: adminService.getAllPartners,
  });

  const statusMutation = useMutation({
    mutationFn: ({ partner, action }: PendingPartnerAction) => {
      switch (action) {
        case 'approve': return adminService.approvePartner(partner.id);
        case 'reject': return adminService.rejectPartner(partner.id);
        case 'suspend': return adminService.suspendPartner(partner.id);
        case 'reactivate': return adminService.reactivatePartner(partner.id);
      }
    },
    onSuccess: async (_updatedPartner, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-pending-partners'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-partners'] }),
      ]);
      toast.success(`Partner ${actionVerbs[variables.action]} successfully`);
      setPendingAction(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to update Partner status');
    },
  });

  const partners = [
    ...(pendingPartnersQuery.data ?? []),
    ...(partnersQuery.data ?? []).filter((partner) => partner.status !== 'PENDING'),
  ].sort((left, right) => {
    const pendingOrder = Number(right.status === 'PENDING') - Number(left.status === 'PENDING');
    return pendingOrder || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
  const isLoading = pendingPartnersQuery.isLoading || partnersQuery.isLoading;
  const isError = pendingPartnersQuery.isError || partnersQuery.isError;
  const queryError = pendingPartnersQuery.error || partnersQuery.error;
  const isFetching = pendingPartnersQuery.isFetching || partnersQuery.isFetching;

  const refreshPartners = () => {
    void Promise.all([pendingPartnersQuery.refetch(), partnersQuery.refetch()]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Partner verification</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Review Partner registrations and manage their existing approval status.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Partners</CardTitle>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Review pending registrations and manage approved Partner accounts.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refreshPartners} disabled={isFetching}>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-8 text-center text-sm text-neutral-500">Loading Partners…</p>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {(queryError as any)?.response?.data?.message
                    || (queryError as Error)?.message
                    || 'Unable to load Partners.'}
                </p>
                <Button variant="outline" size="sm" onClick={refreshPartners} disabled={isFetching}>
                  Retry
                </Button>
              </div>
            ) : partners.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">No Partner registrations yet.</p>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div key={partner.id} className="flex min-w-0 flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-semibold">{partner.user.name}</p>
                        <PartnerStatusBadge status={partner.status} />
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {formatPartnerType(partner.partnerType)}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500">
                        Registered {new Date(partner.createdAt).toLocaleDateString('en-IN')}
                        {' · '}Worker limit {partner.workerLimit ?? 'Unlimited'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {partner.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => setPendingAction({ partner, action: 'approve' })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setPendingAction({ partner, action: 'reject' })}>
                            Reject
                          </Button>
                        </>
                      )}
                      {partner.status === 'APPROVED' && (
                        <Button size="sm" variant="outline" onClick={() => setPendingAction({ partner, action: 'suspend' })}>
                          Suspend
                        </Button>
                      )}
                      {partner.status === 'SUSPENDED' && (
                        <Button size="sm" variant="outline" onClick={() => setPendingAction({ partner, action: 'reactivate' })}>
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => {
            if (!open && !statusMutation.isPending) setPendingAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction ? actionLabels[pendingAction.action] : 'Update Partner'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction && (
                  <>
                    Confirm that you want to {pendingAction.action} {pendingAction.partner.user.name}.
                    {' '}This updates the Partner&apos;s existing approval status.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!pendingAction || statusMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  if (pendingAction) statusMutation.mutate(pendingAction);
                }}
              >
                {statusMutation.isPending ? 'Updating…' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
