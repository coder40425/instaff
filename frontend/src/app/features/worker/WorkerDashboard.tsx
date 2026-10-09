import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import WorkerLayout from '../../layouts/WorkerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { bookingService, workerService, profileService, walletService } from '../../services/api';
import type { WorkerRequirementOffer } from '../../types';
import { Calendar, CheckCircle, Star, Wallet, Clock, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-neutral-300 dark:text-neutral-600'}`} />
    ))}
  </div>
);

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(true);
  const [processedOffers, setProcessedOffers] = useState<WorkerRequirementOffer[]>([]);

  const { data: bookings = [] } = useQuery({
    queryKey: ['worker-bookings'],
    queryFn: bookingService.getWorkerBookings,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: profileService.getWorkerProfile,
    retry: false,
    throwOnError: false,
  });

  const { data: wallet } = useQuery({
    queryKey: ['worker-wallet'],
    queryFn: walletService.getMyWallet,
    retry: false,
  });

  const {
    data: requirementOffers = [],
    isLoading: offersLoading,
    isError: offersError,
  } = useQuery({
    queryKey: ['worker-requirement-offers'],
    queryFn: workerService.getRequirementOffers,
  });

  const rememberOfferResult = (result: Awaited<ReturnType<typeof workerService.acceptRequirementOffer>>) => {
    const originalOffer = requirementOffers.find((offer) => offer.id === result.id);

    if (originalOffer) {
      setProcessedOffers((current) => [
        {
          ...originalOffer,
          status: result.status,
          acceptedAt: result.acceptedAt,
          assignedAt: result.assignedAt,
          rejectedAt: result.rejectedAt,
        },
        ...current.filter((offer) => offer.id !== result.id),
      ].slice(0, 5));
    }

    queryClient.setQueryData<WorkerRequirementOffer[]>(
      ['worker-requirement-offers'],
      (current = []) => current.filter((offer) => offer.id !== result.id)
    );
    queryClient.invalidateQueries({
      queryKey: ['worker-requirement-offers'],
    });
  };

  const acceptOfferMutation = useMutation({
    mutationFn: workerService.acceptRequirementOffer,
    onSuccess: (result) => {
      rememberOfferResult(result);
      toast.success(
        result.status === 'ASSIGNED'
          ? 'Requirement offer accepted'
          : `Offer response recorded: ${result.status}`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to accept requirement offer');
    },
  });

  const rejectOfferMutation = useMutation({
    mutationFn: workerService.rejectRequirementOffer,
    onSuccess: (result) => {
      rememberOfferResult(result);
      toast.success(
        result.status === 'REJECTED'
          ? 'Requirement offer rejected'
          : `Offer response recorded: ${result.status}`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Unable to reject requirement offer');
    },
  });

  useEffect(() => {
    if (existingProfile) setIsAvailable(existingProfile.isAvailable ?? true);
  }, [existingProfile]);

  const profileComplete = !!(
    existingProfile?.aadhaarNumber &&
    existingProfile?.skills?.length > 0 &&
    existingProfile?.experience != null &&
    existingProfile?.expectedSalary != null
  );

  const todaysJobs = bookings.filter((b: any) => {
    const today = new Date().toDateString();
    return new Date(b.createdAt).toDateString() === today;
  }).length;

  const completedJobs = bookings.filter((b: any) => b.status === 'COMPLETED').length;
  const rating: number        = existingProfile?.rating || 0;
  const totalReviews: number  = existingProfile?.totalReviews || 0;

  const pendingBalance   = wallet?.pendingBalance   ?? 0;
  const lifetimeEarnings = wallet?.lifetimeEarnings ?? 0;
  const settledBalance   = wallet?.settledBalance   ?? 0;

  const handleAvailabilityToggle = async (checked: boolean) => {
    if (!profileComplete) {
      toast.error('Please complete your profile before changing availability.');
      navigate('/worker/profile');
      return;
    }
    try {
      await workerService.updateAvailability(checked);
      setIsAvailable(checked);
      toast.success(checked ? 'You are now online' : 'You are now offline');
    } catch {
      toast.error('Failed to update availability');
    }
  };

  return (
    <WorkerLayout>
      <div className="space-y-6">
        {/* Header + availability toggle */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">Welcome back! Here's your overview.</p>
          </div>
          <Card className="w-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="availability"
                  checked={isAvailable}
                  onCheckedChange={handleAvailabilityToggle}
                  disabled={!profileComplete}
                />
                <Label htmlFor="availability" className={`cursor-pointer ${!profileComplete ? 'text-neutral-400' : ''}`}>
                  {isAvailable ? 'Online' : 'Offline'}
                </Label>
              </div>
              {!profileComplete && (
                <p className="text-xs text-orange-500 mt-2 cursor-pointer underline" onClick={() => navigate('/worker/profile')}>
                  Complete profile to go online
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Wallet summary cards ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Requirement Offers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offersLoading ? (
              <p className="py-4 text-sm text-neutral-500">Loading offers…</p>
            ) : offersError ? (
              <p className="py-4 text-sm text-red-600">Unable to load requirement offers.</p>
            ) : requirementOffers.length === 0 && processedOffers.length === 0 ? (
              <p className="py-4 text-sm text-neutral-500">No requirement offers right now.</p>
            ) : (
              <div className="space-y-3">
                {requirementOffers.map((offer) => {
                  const accepting = acceptOfferMutation.isPending && acceptOfferMutation.variables === offer.id;
                  const rejecting = rejectOfferMutation.isPending && rejectOfferMutation.variables === offer.id;
                  const busy = accepting || rejecting;

                  return (
                    <div key={offer.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {offer.requirement.category.name} · {offer.requirement.subCategory.name}
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">
                            {[offer.requirement.city, offer.requirement.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <Badge variant="outline">{offer.status}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-400 sm:grid-cols-3">
                        <p>Joining: {new Date(offer.requirement.joiningDate).toLocaleDateString()}</p>
                        <p>Minimum experience: {offer.requirement.minExperience} years</p>
                        <p>Workers needed: {offer.requirement.requiredWorkerCount}</p>
                        {offer.requirement.shiftTiming && <p>Shift: {offer.requirement.shiftTiming.replace(/_/g, ' ')}</p>}
                        {offer.requirement.salaryBudget != null && <p>Budget: ₹{offer.requirement.salaryBudget}/month</p>}
                        {offer.offeredAt && <p>Offered: {new Date(offer.offeredAt).toLocaleString()}</p>}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptOfferMutation.mutate(offer.id)}
                          disabled={busy}
                        >
                          {accepting ? 'Accepting…' : 'Accept'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectOfferMutation.mutate(offer.id)}
                          disabled={busy}
                        >
                          {rejecting ? 'Rejecting…' : 'Reject'}
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {processedOffers.map((offer) => (
                  <div key={offer.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">
                        {offer.requirement.category.name} · {offer.requirement.subCategory.name}
                      </p>
                      <Badge variant={offer.status === 'ASSIGNED' ? 'default' : 'secondary'}>
                        {offer.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {[offer.requirement.city, offer.requirement.state].filter(Boolean).join(', ')}
                    </p>
                    {offer.acceptedAt && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Accepted: {new Date(offer.acceptedAt).toLocaleString()}
                      </p>
                    )}
                    {offer.rejectedAt && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Rejected: {new Date(offer.rejectedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Wallet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Available Balance</CardTitle>
                <Wallet className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">₹{pendingBalance.toFixed(2)}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Pending settlement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Lifetime Earnings</CardTitle>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">₹{lifetimeEarnings.toFixed(2)}</p>
                <p className="text-xs text-neutral-500 mt-1">Total ever earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Settled</CardTitle>
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">₹{settledBalance.toFixed(2)}</p>
                <p className="text-xs text-neutral-500 mt-1">Paid out by admin</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Activity stats ────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Today's Jobs</CardTitle>
                <Calendar className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{todaysJobs}</p></CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Completed Jobs</CardTitle>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{completedJobs}</p></CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg Rating</CardTitle>
                <Star className="w-5 h-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{rating > 0 ? `${rating.toFixed(1)}/5` : '—'}</p>
                {rating > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <StarDisplay rating={rating} />
                    <p className="text-xs text-neutral-400">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Recent bookings ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {(bookings as any[]).slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {booking.subCategory?.name || 'Service'}
                        <span className="text-xs text-neutral-400 ml-1">({booking.subCategory?.category?.name})</span>
                      </p>
                      <p className="text-sm text-neutral-500">{booking.customerName} · {booking.city}</p>
                      {booking.review && (
                        <div className="flex gap-0.5 pt-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= booking.review.rating ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-neutral-300'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={
                        booking.status === 'COMPLETED'   ? 'default'     :
                        booking.status === 'IN_PROGRESS' ? 'secondary'   :
                        booking.status === 'PENDING'     ? 'outline'     : 'destructive'
                      }>
                        {booking.status}
                      </Badge>
                      <p className="text-sm text-neutral-500">₹{booking.servicePrice ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WorkerLayout>
  );
}
