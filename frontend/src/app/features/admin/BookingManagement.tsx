import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { adminService } from '../../services/api';
import { Calendar, MapPin, IndianRupee, RefreshCw, User, Phone, AlertTriangle, Tag, Hash } from 'lucide-react';

export default function BookingManagement() {
  const queryClient = useQueryClient();

  // Reassign state
  const [reassignBookingId, setReassignBookingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: adminService.getAllBookings,
  });

  const forceCompleteMutation = useMutation({
    mutationFn: (id: string) => adminService.forceCompleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Booking marked as completed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete booking');
    },
  });

  const forceCancelMutation = useMutation({
    mutationFn: (id: string) => adminService.forceCancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Booking cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ bookingId, workerId }: { bookingId: string; workerId: string }) =>
      adminService.assignReplacement(bookingId, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Worker reassigned successfully');
      setReassignBookingId(null);
      setCandidates([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reassign worker');
    },
  });

  const handleOpenReassign = async (bookingId: string) => {
    setReassignBookingId(bookingId);
    setCandidates([]);
    setCandidatesLoading(true);
    try {
      const data = await adminService.getReplacementCandidates(bookingId);
      setCandidates(data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load replacement candidates');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleCloseReassign = () => {
    setReassignBookingId(null);
    setCandidates([]);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
      ACCEPTED: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      IN_PROGRESS: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
      COMPLETED: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      CANCELLED: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      REJECTED: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      NO_SHOW: 'bg-neutral-100 dark:bg-neutral-900/20 text-neutral-700 dark:text-neutral-300',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  // Defensive field readers — the admin bookings payload may expose these
  // as flattened fields (customerName) and/or nested relations (customer.name).
  // We try both without assuming either shape, so nothing breaks either way.
  const getCustomerName = (b: any) => b.customerName || b.customer?.name || 'N/A';
  const getCustomerPhone = (b: any) => b.customerPhone || b.customer?.phone || null;
  const getWorkerName = (b: any) => b.workerName || b.worker?.user?.name || 'N/A';
  const getWorkerPhone = (b: any) => b.workerPhone || b.worker?.user?.phone || null;
  const getCategory = (b: any) => b.categoryName || b.subCategory?.category?.name || null;
  const getServiceType = (b: any) => b.serviceCategory || b.subCategory?.name || 'Service';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Booking Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm sm:text-base">
            Oversee and manage all bookings
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-neutral-500">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-neutral-500">No bookings found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <Card
                key={booking.id}
                className={booking.replacementRequested ? 'border-orange-300 dark:border-orange-800' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{getServiceType(booking)}</CardTitle>
                        {getCategory(booking) && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {getCategory(booking)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-mono flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {booking.id}
                      </p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer / Worker block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Customer</p>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span className="font-medium truncate">{getCustomerName(booking)}</span>
                      </div>
                      {getCustomerPhone(booking) && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{getCustomerPhone(booking)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Current Worker</p>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span className="font-medium truncate">{getWorkerName(booking)}</span>
                      </div>
                      {getWorkerPhone(booking) && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{getWorkerPhone(booking)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                      <span>{new Date(booking.scheduledDate || booking.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                      <span className="truncate">{booking.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                      <span>₹{booking.servicePrice}</span>
                    </div>
                  </div>

                  {booking.address && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      <strong>Address:</strong> {booking.address}
                    </div>
                  )}

                  {/* Show replacement request info if flagged */}
                  {booking.replacementRequested && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                          Replacement Requested
                        </p>
                        {booking.replacementReason && (
                          <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
                            {booking.replacementReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
                      <>
                        <Button
                          size="sm"
                          variant={booking.replacementRequested ? 'default' : 'outline'}
                          onClick={() => handleOpenReassign(booking.id)}
                          className="gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {booking.replacementRequested ? 'Find Replacement' : 'Reassign Worker'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceCompleteMutation.mutate(booking.id)}
                          disabled={forceCompleteMutation.isPending}
                        >
                          Force Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => forceCancelMutation.mutate(booking.id)}
                          disabled={forceCancelMutation.isPending}
                        >
                          Force Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reassign Worker Dialog */}
      <Dialog open={!!reassignBookingId} onOpenChange={(open) => { if (!open) handleCloseReassign(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Find Replacement Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Matching verified, available workers in the same city and skill category. The booking will be reset to PENDING for the new worker to accept.
            </p>

            {candidatesLoading ? (
              <div className="text-center py-8 text-sm text-neutral-500">
                Loading available workers...
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-500">No available replacement workers found in this city and category.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {candidates.map((worker: any) => (
                  <div
                    key={worker.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-black dark:hover:border-white transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span className="font-semibold text-sm">{worker.user?.name || 'N/A'}</span>
                        <Badge variant="secondary" className="text-xs">{worker.skillCategory}</Badge>
                        {worker.isVerified && (
                          <Badge className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{worker.user?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                        <span>{worker.city || 'N/A'}</span>
                        <span>·</span>
                        <span>{worker.experience ?? 0} yrs exp</span>
                        <span>·</span>
                        <span>₹{worker.expectedSalary ?? 0}/mo</span>
                        {worker.rating > 0 && (
                          <>
                            <span>·</span>
                            <span>★ {worker.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() =>
                        reassignMutation.mutate({
                          bookingId: reassignBookingId!,
                          workerId: worker.userId,
                        })
                      }
                      disabled={reassignMutation.isPending}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={handleCloseReassign}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}