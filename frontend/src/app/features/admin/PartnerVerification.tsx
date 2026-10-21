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
import type { AdminPartnerVerificationDetails } from '../../types/partner';

type PartnerAdminAction = 'approve' | 'reject' | 'suspend' | 'reactivate';
type PendingPartnerAction = { partner: AdminPartnerProfile; action: PartnerAdminAction };
type PendingReviewAction = {
  partnerId: string;
  partnerName: string;
  recordId: string;
  recordType: 'submission' | 'document';
  action: 'approve' | 'reject';
};

const verificationFieldLabels: Record<string, string> = {
  name: 'Proposed account name',
  businessRegistrationNumber: 'Proposed business registration number',
  panNumber: 'Proposed PAN',
  gstin: 'Proposed GSTIN',
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value?.trim() || '—'}</dd>
    </div>
  );
}

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
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReviewAction | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const pendingPartnersQuery = useQuery({
    queryKey: ['admin-pending-partners'],
    queryFn: adminService.getPendingPartners,
  });

  const partnersQuery = useQuery({
    queryKey: ['admin-partners'],
    queryFn: adminService.getAllPartners,
  });

  const verificationQuery = useQuery<AdminPartnerVerificationDetails>({
    queryKey: ['admin-partner-verification', expandedPartnerId],
    queryFn: () => adminService.getPartnerVerificationDetails(expandedPartnerId!),
    enabled: !!expandedPartnerId,
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

  const reviewMutation = useMutation({
    mutationFn: (action: PendingReviewAction & { reason?: string }) => {
      if (action.recordType === 'submission') {
        return action.action === 'approve'
          ? adminService.approvePartnerSubmission(action.partnerId, action.recordId)
          : adminService.rejectPartnerSubmission(action.partnerId, action.recordId, action.reason ?? '');
      }
      return action.action === 'approve'
        ? adminService.approvePartnerDocument(action.partnerId, action.recordId)
        : adminService.rejectPartnerDocument(action.partnerId, action.recordId, action.reason ?? '');
    },
    onSuccess: async (_result, action) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-partner-verification', action.partnerId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-pending-partners'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-partners'] }),
        queryClient.invalidateQueries({ queryKey: ['partner-profile'] }),
      ]);
      toast.success(`${action.recordType === 'submission' ? 'Verification submission' : 'Document'} ${action.action === 'approve' ? 'approved' : 'rejected'}`);
      setPendingReview(null);
      setReviewReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to review verification');
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
                {partners.map((partner) => {
                  const expanded = expandedPartnerId === partner.id;
                  const details = expanded && verificationQuery.data?.id === partner.id
                    ? verificationQuery.data
                    : undefined;
                  return (
                    <div key={partner.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedPartnerId(expanded ? null : partner.id)}
                          >
                            {expanded ? 'Hide details' : 'Review details'}
                          </Button>
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

                      {expanded && (
                        <div className="mt-5 space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                          {verificationQuery.isLoading ? (
                            <p className="text-sm text-neutral-500">Loading verification details…</p>
                          ) : verificationQuery.isError ? (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-red-600 dark:text-red-400">
                              <span>{(verificationQuery.error as any)?.response?.data?.message || 'Unable to load verification details.'}</span>
                              <Button size="sm" variant="outline" onClick={() => verificationQuery.refetch()}>Retry</Button>
                            </div>
                          ) : details ? (
                            <>
                              <section>
                                <h3 className="font-semibold">Business and contact</h3>
                                <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <Detail label="Account name" value={details.user.name} />
                                  <Detail label="Registered phone" value={details.user.phone} />
                                  <Detail label="Partner type" value={formatPartnerType(details.partnerType)} />
                                  <Detail label="Business / legal name" value={details.businessName} />
                                  <Detail label="Business email" value={details.email} />
                                  <Detail label="Contact person" value={details.contactPerson} />
                                  <Detail label="Alternate phone" value={details.alternatePhone} />
                                  <Detail label="Business registration number" value={details.businessRegistrationNumber} />
                                  <Detail label="PAN" value={details.panNumber} />
                                  <Detail label="GSTIN" value={details.gstin} />
                                  <Detail label="Website" value={details.website} />
                                  <Detail label="Profile photo / logo URL" value={details.profilePhotoUrl} />
                                  <Detail label="Business description" value={details.description} />
                                  <Detail label="Address" value={[details.addressLine1, details.addressLine2, details.city, details.district, details.state, details.postalCode, details.country].filter(Boolean).join(', ')} />
                                </dl>
                              </section>

                              <section>
                                <h3 className="font-semibold">Sensitive-field submissions</h3>
                                <div className="mt-3 space-y-3">
                                  {details.verificationSubmissions.length === 0 ? (
                                    <p className="text-sm text-neutral-500">No verification submissions.</p>
                                  ) : details.verificationSubmissions.map((submission) => (
                                    <div key={submission.id} className="rounded-md bg-neutral-50 p-3 dark:bg-neutral-900">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium">{submission.status} · Submitted {new Date(submission.submittedAt).toLocaleString('en-IN')}</p>
                                        {submission.status === 'PENDING' && (
                                          <div className="flex gap-2">
                                            <Button size="sm" onClick={() => setPendingReview({ partnerId: partner.id, partnerName: partner.user.name, recordId: submission.id, recordType: 'submission', action: 'approve' })}>Approve changes</Button>
                                            <Button size="sm" variant="destructive" onClick={() => { setReviewReason(''); setPendingReview({ partnerId: partner.id, partnerName: partner.user.name, recordId: submission.id, recordType: 'submission', action: 'reject' }); }}>Reject changes</Button>
                                          </div>
                                        )}
                                      </div>
                                      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {Object.entries(submission.proposedChanges).map(([key, value]) => (
                                          <Detail key={key} label={verificationFieldLabels[key] ?? key} value={value} />
                                        ))}
                                      </dl>
                                      {submission.reviewedAt && <p className="mt-2 text-xs text-neutral-500">Reviewed {new Date(submission.reviewedAt).toLocaleString('en-IN')}{submission.reviewedBy ? ` by ${submission.reviewedBy}` : ''}</p>}
                                      {submission.rejectionReason && <p className="mt-2 text-sm text-red-700 dark:text-red-400">Reason: {submission.rejectionReason}</p>}
                                    </div>
                                  ))}
                                </div>
                              </section>

                              <section>
                                <h3 className="font-semibold">Documents</h3>
                                <p className="mt-1 text-xs text-neutral-500">Protected document preview and download are unavailable because no secure storage integration is configured.</p>
                                <div className="mt-3 space-y-3">
                                  {details.documents.length === 0 ? (
                                    <p className="text-sm text-neutral-500">No documents have been submitted.</p>
                                  ) : details.documents.map((document) => (
                                    <div key={document.id} className="flex flex-col gap-3 rounded-md bg-neutral-50 p-3 dark:bg-neutral-900 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="break-words font-medium">{document.documentType.replace(/_/g, ' ')} · {document.fileName}</p>
                                        <p className="text-xs text-neutral-500">{document.mimeType ?? 'Unknown type'}{document.fileSize ? ` · ${document.fileSize.toLocaleString()} bytes` : ''} · {document.verificationStatus} · Submitted {new Date(document.createdAt).toLocaleString('en-IN')}</p>
                                        {document.reviewedAt && <p className="text-xs text-neutral-500">Reviewed {new Date(document.reviewedAt).toLocaleString('en-IN')}{document.reviewedBy ? ` by ${document.reviewedBy}` : ''}</p>}
                                        {document.rejectionReason && <p className="mt-1 text-sm text-red-700 dark:text-red-400">Reason: {document.rejectionReason}</p>}
                                      </div>
                                      {document.verificationStatus === 'PENDING' && (
                                        <div className="flex shrink-0 gap-2">
                                          <Button size="sm" onClick={() => setPendingReview({ partnerId: partner.id, partnerName: partner.user.name, recordId: document.id, recordType: 'document', action: 'approve' })}>Approve</Button>
                                          <Button size="sm" variant="destructive" onClick={() => { setReviewReason(''); setPendingReview({ partnerId: partner.id, partnerName: partner.user.name, recordId: document.id, recordType: 'document', action: 'reject' }); }}>Reject</Button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
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

        <AlertDialog
          open={!!pendingReview}
          onOpenChange={(open) => {
            if (!open && !reviewMutation.isPending) {
              setPendingReview(null);
              setReviewReason('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingReview?.action === 'approve' ? 'Approve verification' : 'Reject verification'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingReview && (
                  <>Confirm that you want to {pendingReview.action} this {pendingReview.recordType} for {pendingReview.partnerName}. This does not change the Partner account approval status.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {pendingReview?.action === 'reject' && (
              <div className="space-y-2">
                <label htmlFor="partner-verification-rejection-reason" className="text-sm font-medium">Rejection reason (required)</label>
                <textarea
                  id="partner-verification-rejection-reason"
                  className="min-h-24 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-700"
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                  maxLength={1000}
                  required
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reviewMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!pendingReview || reviewMutation.isPending || (pendingReview.action === 'reject' && !reviewReason.trim())}
                onClick={(event) => {
                  event.preventDefault();
                  if (!pendingReview) return;
                  if (pendingReview.action === 'reject' && !reviewReason.trim()) {
                    toast.error('A rejection reason is required');
                    return;
                  }
                  reviewMutation.mutate({ ...pendingReview, reason: reviewReason.trim() });
                }}
              >
                {reviewMutation.isPending ? 'Saving…' : pendingReview?.action === 'approve' ? 'Approve' : 'Reject'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
