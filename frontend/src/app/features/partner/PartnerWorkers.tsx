import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, MapPin, Search, UserRound, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import PartnerLayout from '../../layouts/PartnerLayout';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { workerService } from '../../services/api';
import { partnerService } from '../../services/partnerApi';
import type { PublicWorkerProfile } from '../../types';
import { PartnerStatusBadge } from '../../components/ui/partner/PartnerStatusBadge';
import { PartnerWorkerCard } from '../../components/ui/partner/PartnerWorkerCard';

export default function PartnerWorkers() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [inviteInfoOpen, setInviteInfoOpen] = useState(false);
  const [workerToRemove, setWorkerToRemove] = useState<PublicWorkerProfile | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const profileQuery = useQuery({
    queryKey: ['partner-profile'],
    queryFn: partnerService.getProfile,
  });
  const approved = profileQuery.data?.status === 'APPROVED';

  const workersQuery = useQuery({
    queryKey: ['partner-workers'],
    queryFn: partnerService.getWorkers,
    enabled: approved,
  });

  const discoveryQuery = useQuery({
    queryKey: ['partner-worker-discovery', search],
    queryFn: () => workerService.getAll(search ? { search } : {}),
    enabled: approved,
  });

  const addMutation = useMutation({
    mutationFn: (selectedWorker: PublicWorkerProfile) => partnerService.associateWorker(selectedWorker.id),
    onSuccess: async (_worker, selectedWorker) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partner-workers'] }),
        queryClient.invalidateQueries({ queryKey: ['partner-profile'] }),
      ]);
      toast.success(`${selectedWorker.user?.name || 'Worker'} added to your workforce`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to add this worker');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => partnerService.removeWorker(id),
    onSuccess: async () => {
      setWorkerToRemove(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partner-workers'] }),
        queryClient.invalidateQueries({ queryKey: ['partner-profile'] }),
      ]);
      toast.success('Worker removed from your Partner profile');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to remove this worker');
    },
  });

  const workerLimit = profileQuery.data?.workerLimit ?? null;
  const workerCount = profileQuery.data?.workerCount ?? 0;
  const limitReached = workerLimit !== null && workerCount >= workerLimit;
  const formError = (profileQuery.error as any)?.response?.data?.message
    || (workersQuery.error as any)?.response?.data?.message
    || (discoveryQuery.error as any)?.response?.data?.message
    || (profileQuery.error as Error | null)?.message
    || (workersQuery.error as Error | null)?.message
    || (discoveryQuery.error as Error | null)?.message;
  const associatedWorkerIds = new Set((workersQuery.data ?? []).map((worker) => worker.id));

  return (
    <PartnerLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My workers</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Manage workers associated with your Partner profile.
            </p>
          </div>
          {profileQuery.data && (
            <div className="flex items-center gap-2 text-sm">
              <UsersRound className="h-4 w-4 text-neutral-500" />
              <span className="font-semibold">{workerCount}</span>
              <span className="text-neutral-500">/ {workerLimit ?? 'Unlimited'} workers</span>
            </div>
          )}
        </div>

        {profileQuery.isLoading ? (
          <Card><CardContent className="py-10 text-center text-neutral-500">Loading Partner profile…</CardContent></Card>
        ) : profileQuery.isError || !profileQuery.data ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{formError || 'Unable to load your Partner profile.'}</p>
              <Button variant="outline" onClick={() => profileQuery.refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : profileQuery.data.status !== 'APPROVED' ? (
          <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Worker management is unavailable until approval.</p>
                  <PartnerStatusBadge status={profileQuery.data.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">You can check your approval status on your profile.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Find NearPassway workers</CardTitle>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Browse verified workers and add them to your workforce. Workers remain members of NearPassway; this only creates an association.
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="workerSearch"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name, city, category or work type"
                    className="pl-9"
                    autoComplete="off"
                    disabled={addMutation.isPending}
                  />
                </div>
                {limitReached && (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    Your worker limit has been reached. Remove an association before adding another worker.
                  </p>
                )}

                <div className="mt-5">
                  {discoveryQuery.isLoading ? (
                    <p className="py-8 text-center text-sm text-neutral-500">Searching verified workers…</p>
                  ) : discoveryQuery.isError ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <p className="text-sm text-red-600 dark:text-red-400">{formError || 'Unable to find workers.'}</p>
                      <Button variant="outline" size="sm" onClick={() => discoveryQuery.refetch()}>Retry</Button>
                    </div>
                  ) : !discoveryQuery.data?.length ? (
                    <p className="py-8 text-center text-sm text-neutral-500">
                      {search ? 'No verified workers found. Try another search.' : 'No verified workers are available right now.'}
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {discoveryQuery.data.map((worker) => {
                        const alreadyAssociated = associatedWorkerIds.has(worker.id);
                        const categories = [...new Set(worker.skills.flatMap((skill) => skill.subCategory.category?.name ? [skill.subCategory.category.name] : []))];
                        const workTypes = [...new Set(worker.skills.flatMap((skill) => skill.subCategory.name ? [skill.subCategory.name] : []))];
                        const isAddingThisWorker = addMutation.isPending && addMutation.variables?.id === worker.id;

                        return (
                          <Card key={worker.id} className="min-w-0">
                            <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
                              <div className="flex min-w-0 items-start gap-3">
                                {worker.profilePhotoUrl ? (
                                  <img src={worker.profilePhotoUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                    <UserRound className="h-5 w-5 text-neutral-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="break-words font-semibold">{worker.user?.name || 'NearPassway worker'}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    <span>{worker.experience} yrs experience</span>
                                    {worker.gender && <span>{worker.gender.toLowerCase()}</span>}
                                    {worker.education && <span>{worker.education}</span>}
                                  </div>
                                </div>
                                {worker.isVerified && (
                                  <Badge variant="outline" className="shrink-0 border-green-200 text-green-700 dark:border-green-900 dark:text-green-300">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />Verified
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {categories.map((category) => (
                                  <Badge key={'category-' + worker.id + '-' + category} variant="outline">{category}</Badge>
                                ))}
                                {workTypes.map((workType) => (
                                  <Badge key={'work-' + worker.id + '-' + workType} variant="secondary" className="max-w-full break-words font-normal">{workType}</Badge>
                                ))}
                                {!workTypes.length && <span className="text-xs text-neutral-500">No public work types listed</span>}
                              </div>

                              {(worker.city || worker.state) && (
                                <p className="flex items-center gap-1.5 break-words text-sm text-neutral-600 dark:text-neutral-400">
                                  <MapPin className="h-4 w-4 flex-shrink-0" />
                                  {[worker.city, worker.state].filter(Boolean).join(', ')}
                                </p>
                              )}

                              <div className="mt-auto flex flex-col gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                                <Badge
                                  variant="outline"
                                  className={worker.isAvailable
                                    ? 'w-fit border-green-200 text-green-700 dark:border-green-900 dark:text-green-300'
                                    : 'w-fit text-neutral-500'}
                                >
                                  {worker.isAvailable ? 'Available' : 'Unavailable'}
                                </Badge>
                                <Button
                                  className="w-full"
                                  variant={alreadyAssociated ? 'outline' : 'default'}
                                  disabled={alreadyAssociated || limitReached || addMutation.isPending}
                                  onClick={() => addMutation.mutate(worker)}
                                >
                                  {alreadyAssociated
                                    ? 'Already in your workforce'
                                    : isAddingThisWorker
                                      ? 'Adding…'
                                      : limitReached
                                        ? 'Worker limit reached'
                                        : 'Add to my workforce'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Can&apos;t find your worker?</p>
                  <Button variant="outline" onClick={() => setInviteInfoOpen(true)}>Invite a new worker</Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Associated workforce</h2>
              {workersQuery.isLoading ? (
                <Card><CardContent className="py-10 text-center text-neutral-500">Loading workers…</CardContent></Card>
              ) : workersQuery.isError ? (
                <Card className="border-red-200 dark:border-red-900">
                  <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{formError || 'Unable to load associated workers.'}</p>
                    <Button variant="outline" onClick={() => workersQuery.refetch()}>Retry</Button>
                  </CardContent>
                </Card>
              ) : !workersQuery.data?.length ? (
                <Card><CardContent className="py-12 text-center">
                  <UsersRound className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-700" />
                  <p className="mt-3 font-medium">No workers associated yet</p>
                  <p className="mt-1 text-sm text-neutral-500">Search for a verified NearPassway worker to add to your workforce.</p>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {workersQuery.data.map((worker) => (
                    <PartnerWorkerCard key={worker.id} worker={worker} onRemove={() => setWorkerToRemove(worker)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <AlertDialog open={!!workerToRemove} onOpenChange={(open) => { if (!open) setWorkerToRemove(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this worker?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the association with {workerToRemove?.user?.name || 'this worker'}. Their NearPassway worker account remains unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removeMutation.isPending}>Keep worker</AlertDialogCancel>
              <AlertDialogAction
                disabled={removeMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  if (workerToRemove) removeMutation.mutate(workerToRemove.id);
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {removeMutation.isPending ? 'Removing…' : 'Remove association'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={inviteInfoOpen} onOpenChange={setInviteInfoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Worker invitations are not active yet</AlertDialogTitle>
              <AlertDialogDescription>
                The worker invitation flow will be available here after it is finalized. No invitation will be sent or recorded at this time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setInviteInfoOpen(false)}>Got it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PartnerLayout>
  );
}
