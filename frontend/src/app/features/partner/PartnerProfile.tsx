import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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

export default function PartnerProfile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const { data: profile, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['partner-profile'],
    queryFn: partnerService.getProfile,
  });
  const updateMutation = useMutation({
    mutationFn: partnerService.updateProfile,
    onSuccess: (updatedProfile) => {
      updateUser({ name: updatedProfile.name });
      setName(updatedProfile.name);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (updateError: any) => {
      toast.error(updateError.response?.data?.message || 'Unable to update your profile');
    },
  });

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Partner profile</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Your account and approval information.</p>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading profile…</CardContent></Card>
        ) : isError || !profile ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {(error as any)?.response?.data?.message || (error as Error)?.message || 'Unable to load your profile.'}
              </p>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Account</CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setName(user?.name ?? ''); setIsEditing(true); }}
                  >
                    Edit profile
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const trimmedName = name.trim();
                      if (!trimmedName) {
                        toast.error('Name is required');
                        return;
                      }
                      updateMutation.mutate({ name: trimmedName });
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="partner-name">Name</Label>
                      <Input
                        id="partner-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={updateMutation.isPending}
                        onClick={() => { setName(user?.name ?? ''); setIsEditing(false); }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                )}
                <div className={isEditing ? 'hidden' : undefined}>
                  <p className="text-xs text-neutral-500">Name</p>
                  <p className="mt-1 font-medium">{user?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Phone</p>
                  <p className="mt-1 font-medium">{user?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Partner type</p>
                  <p className="mt-1 font-medium">{formatPartnerType(profile.partnerType)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Partner status</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Approval</span>
                  <PartnerStatusBadge status={profile.status} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Associated workers</span>
                  <span className="font-semibold">{profile.workerCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Worker limit</span>
                  <span className="font-semibold">{profile.workerLimit ?? 'Unlimited'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Registered</span>
                  <span className="text-sm">{new Date(profile.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
