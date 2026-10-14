import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import PartnerLayout from '../../layouts/PartnerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { formatPartnerType } from '../../components/ui/partner/partnerFormatting';
import { partnerService } from '../../services/partnerApi';
import { useAuth } from '../../hooks/useAuth';
import type { PartnerProfile, PartnerProfileEditableFields, PartnerProfileUpdate } from '../../types/partner';

type EditableField = keyof PartnerProfileEditableFields;

const fieldGroups: { title: string; fields: { key: EditableField; label: string; type?: 'email' | 'url' }[] }[] = [
  {
    title: 'Business and contact',
    fields: [
      { key: 'businessName', label: 'Business / legal name' },
      { key: 'email', label: 'Business email', type: 'email' },
      { key: 'contactPerson', label: 'Contact person' },
      { key: 'alternatePhone', label: 'Alternate phone' },
      { key: 'profilePhotoUrl', label: 'Profile photo / business logo URL', type: 'url' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'description', label: 'Business description' },
    ],
  },
  {
    title: 'Business verification details',
    fields: [
      { key: 'businessRegistrationNumber', label: 'Business registration number' },
      { key: 'panNumber', label: 'PAN' },
      { key: 'gstin', label: 'GSTIN' },
    ],
  },
  {
    title: 'Address',
    fields: [
      { key: 'addressLine1', label: 'Address line 1' },
      { key: 'addressLine2', label: 'Address line 2' },
      { key: 'city', label: 'City' },
      { key: 'district', label: 'District' },
      { key: 'state', label: 'State' },
      { key: 'postalCode', label: 'PIN / postal code' },
      { key: 'country', label: 'Country' },
    ],
  },
];

const fieldLabels: Record<string, string> = {
  name: 'Account name',
  businessRegistrationNumber: 'Business registration number',
  panNumber: 'PAN',
  gstin: 'GSTIN',
};

const statusLabel = (status: string) => ({
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}[status] ?? status);

const updateFromProfile = (profile: PartnerProfile): PartnerProfileUpdate => ({
  name: profile.name,
  businessName: profile.businessName,
  contactPerson: profile.contactPerson,
  email: profile.email,
  alternatePhone: profile.alternatePhone,
  profilePhotoUrl: profile.profilePhotoUrl,
  businessRegistrationNumber: profile.businessRegistrationNumber,
  panNumber: profile.panNumber,
  gstin: profile.gstin,
  website: profile.website,
  description: profile.description,
  addressLine1: profile.addressLine1,
  addressLine2: profile.addressLine2,
  city: profile.city,
  district: profile.district,
  state: profile.state,
  postalCode: profile.postalCode,
  country: profile.country,
});

export default function PartnerProfile() {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PartnerProfileUpdate>({ name: '' });
  const profileQuery = useQuery({
    queryKey: ['partner-profile'],
    queryFn: partnerService.getProfile,
  });
  const updateMutation = useMutation({
    mutationFn: partnerService.updateProfile,
    onSuccess: async (updatedProfile) => {
      updateUser({ name: updatedProfile.name });
      queryClient.setQueryData(['partner-profile'], updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ['partner-profile'] });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (updateError: any) => {
      toast.error(updateError.response?.data?.message || 'Unable to update your profile');
    },
  });

  const startEditing = (profile: PartnerProfile) => {
    setForm(updateFromProfile(profile));
    setIsEditing(true);
  };

  const setField = (key: EditableField, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Partner profile</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Manage your business details and review verification activity.
          </p>
        </div>

        {profileQuery.isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading profile…</CardContent></Card>
        ) : profileQuery.isError || !profileQuery.data ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {(profileQuery.error as any)?.response?.data?.message
                  || (profileQuery.error as Error)?.message
                  || 'Unable to load your profile.'}
              </p>
              <Button variant="outline" onClick={() => profileQuery.refetch()} disabled={profileQuery.isFetching}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap justify-end gap-2">
              {!isEditing ? (
                <Button variant="outline" onClick={() => startEditing(profileQuery.data)}>Edit profile</Button>
              ) : null}
            </div>

            {isEditing ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!form.name.trim()) {
                    toast.error('Account name is required');
                    return;
                  }
                  updateMutation.mutate({ ...form, name: form.name.trim() });
                }}
              >
                <Card>
                  <CardHeader><CardTitle className="text-base">Account and contact</CardTitle></CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="partner-account-name">Account name</Label>
                      <Input
                        id="partner-account-name"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-registered-phone">Registered phone</Label>
                      <Input id="partner-registered-phone" value={profileQuery.data.phone} readOnly disabled />
                    </div>
                    {fieldGroups[0].fields.map(({ key, label, type }) => (
                      <div className="space-y-2" key={key}>
                        <Label htmlFor={`partner-${key}`}>{label}</Label>
                        <Input
                          id={`partner-${key}`}
                          type={type ?? 'text'}
                          value={form[key] ?? ''}
                          onChange={(event) => setField(key, event.target.value)}
                          maxLength={key === 'description' ? 2000 : undefined}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor="partner-type">Partner type</Label>
                      <Input id="partner-type" value={formatPartnerType(profileQuery.data.partnerType)} readOnly disabled />
                    </div>
                  </CardContent>
                </Card>

                {fieldGroups.slice(1).map((group) => (
                  <Card key={group.title}>
                    <CardHeader><CardTitle className="text-base">{group.title}</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map(({ key, label, type }) => (
                        <div className="space-y-2" key={key}>
                          <Label htmlFor={`partner-${key}`}>{label}</Label>
                          <Input
                            id={`partner-${key}`}
                            type={type ?? 'text'}
                            value={form[key] ?? ''}
                            onChange={(event) => setField(key, event.target.value)}
                            maxLength={key === 'description' ? 2000 : undefined}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => setIsEditing(false)}
                  >Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Account and contact</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <ReadOnlyField label="Account name" value={profileQuery.data.name} />
                      <ReadOnlyField label="Registered phone" value={profileQuery.data.phone} />
                      <ReadOnlyField label="Partner type" value={formatPartnerType(profileQuery.data.partnerType)} />
                      {fieldGroups[0].fields.map(({ key, label }) => (
                        <ReadOnlyField key={key} label={label} value={profileQuery.data[key]} />
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Partner status</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Approval</span>
                        <PartnerStatusBadge status={profileQuery.data.status} />
                      </div>
                      <StatusValue label="Associated workers" value={String(profileQuery.data.workerCount)} />
                      <StatusValue label="Worker limit" value={profileQuery.data.workerLimit ?? 'Unlimited'} />
                      <StatusValue label="Registered" value={new Date(profileQuery.data.createdAt).toLocaleDateString('en-IN')} />
                    </CardContent>
                  </Card>
                </div>

                {fieldGroups.slice(1).map((group) => (
                  <Card key={group.title}>
                    <CardHeader><CardTitle className="text-base">{group.title}</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map(({ key, label }) => (
                        <ReadOnlyField key={key} label={label} value={profileQuery.data[key]} />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Verification submissions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {profileQuery.data.verificationSubmissions.length === 0 ? (
                  <p className="text-sm text-neutral-500">No verification submissions yet.</p>
                ) : profileQuery.data.verificationSubmissions.map((submission) => (
                  <div key={submission.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{statusLabel(submission.status)}</p>
                      <p className="text-xs text-neutral-500">Submitted {new Date(submission.submittedAt).toLocaleString('en-IN')}</p>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      {Object.entries(submission.proposedChanges).map(([key, value]) => (
                        <ReadOnlyField key={key} label={fieldLabels[key] ?? key} value={value} />
                      ))}
                    </dl>
                    {submission.reviewedAt && <p className="mt-3 text-xs text-neutral-500">Reviewed {new Date(submission.reviewedAt).toLocaleString('en-IN')}</p>}
                    {submission.rejectionReason && <p className="mt-2 text-sm text-red-700 dark:text-red-400">Reason: {submission.rejectionReason}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {profileQuery.data.documents.length === 0 ? (
                  <div className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>No documents have been submitted. Secure document upload is not configured for this deployment.</p>
                  </div>
                ) : profileQuery.data.documents.map((document) => (
                  <div key={document.id} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{document.fileName}</p>
                      <p className="text-xs text-neutral-500">{document.documentType.replace(/_/g, ' ')} · Added {new Date(document.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${document.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : document.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                      {statusLabel(document.verificationStatus)}
                    </span>
                    {document.rejectionReason && <p className="text-sm text-red-700 dark:text-red-400">Reason: {document.rejectionReason}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PartnerLayout>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const displayValue = typeof value === 'string' && value.trim() ? value : '—';
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{displayValue}</dd>
    </div>
  );
}

function StatusValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
