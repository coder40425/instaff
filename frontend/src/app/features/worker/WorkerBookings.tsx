import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import WorkerLayout from '../../layouts/WorkerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import BookingCancellationDialog from '../../components/BookingCancellationDialog';
import BookingCancellationDetails from '../../components/BookingCancellationDetails';
import { bookingService, profileService } from '../../services/api';
import { Calendar, MapPin, DollarSign, Star, Wallet, CheckCircle, QrCode } from 'lucide-react';

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-neutral-300 dark:text-neutral-600'}`} />
    ))}
  </div>
);

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    PENDING:     'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    ACCEPTED:    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    IN_PROGRESS: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
    COMPLETED:   'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    CANCELLED:   'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    REJECTED:    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    NO_SHOW:     'bg-neutral-100 dark:bg-neutral-900/20 text-neutral-700 dark:text-neutral-300',
  };
  return <Badge className={colors[status] || ''}>{status.replace('_', ' ')}</Badge>;
};

export default function WorkerBookings() {
  const queryClient = useQueryClient();

  // Payment popup state
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [cancellationBooking, setCancellationBooking] = useState<any>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['worker-bookings'],
    queryFn: bookingService.getWorkerBookings,
  });

  // Fetch platform payment info for QR popup
  const { data: paymentInfo } = useQuery({
    queryKey: ['payment-info-worker'],
    queryFn: profileService.getPaymentInfo,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => bookingService.acceptBooking(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); toast.success('Booking accepted!'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to accept booking'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => bookingService.rejectBooking(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); toast.success('Booking rejected'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reject booking'),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingService.cancelWorkerBooking(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-bookings'] });
      setCancellationBooking(null);
      toast.success('Booking cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: string) => bookingService.confirmPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallet'] });
      toast.success('Payment confirmed! Amount added to your wallet.');
      setPaymentBooking(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to confirm payment'),
  });

  const completedBookings = (bookings as any[]).filter((b) => b.status === 'COMPLETED');
  const reviewedBookings  = completedBookings.filter((b) => b.review);
  const averageRating     = reviewedBookings.length > 0
    ? reviewedBookings.reduce((sum: number, b: any) => sum + b.review.rating, 0) / reviewedBookings.length
    : 0;

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Manage your service bookings</p>
        </div>

        {reviewedBookings.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div>
              <span className="text-xs text-neutral-500 uppercase tracking-wider">Your Average Rating</span>
              <div className="flex items-center gap-2 mt-1">
                <StarDisplay rating={Math.round(averageRating)} />
                <span className="font-bold text-lg">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-neutral-500">from {reviewedBookings.length} review{reviewedBookings.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">Loading bookings…</div>
        ) : (bookings as any[]).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-neutral-500">No bookings yet. Make sure you're available!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(bookings as any[]).map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {booking.subCategory?.name || 'Service'}
                        <span className="text-sm font-normal text-neutral-400 ml-2">
                          ({booking.subCategory?.category?.name})
                        </span>
                      </CardTitle>
                      <p className="text-xs text-neutral-400 mt-0.5 font-mono">ID: {booking.id}</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        Customer: {booking.customerName || 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-500" />
                      <span>{booking.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-neutral-500" />
                      <span>₹{booking.servicePrice ?? '—'}</span>
                    </div>
                  </div>

                  {booking.address && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      <strong>Address:</strong> {booking.address}
                    </p>
                  )}
                  {booking.notes && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  )}

                  <BookingCancellationDetails
                    status={booking.status}
                    cancelledAt={booking.cancelledAt}
                    cancellationReason={booking.cancellationReason}
                    cancelledBy={booking.cancelledBy}
                  />

                  {/* ── Action buttons by status ─────────────────────────── */}

                  {booking.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => acceptMutation.mutate(booking.id)} disabled={acceptMutation.isPending}>
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(booking.id)} disabled={rejectMutation.isPending}>
                        Reject
                      </Button>
                    </div>
                  )}

                  {booking.status === 'ACCEPTED' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Waiting for customer to start service</p>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setCancellationBooking(booking)}
                        disabled={cancelBookingMutation.isPending}
                      >
                        Cancel Booking
                      </Button>
                    </div>
                  )}

                  {booking.status === 'IN_PROGRESS' && (
                    <p className="text-sm text-purple-600 dark:text-purple-400">Service in progress…</p>
                  )}

                  {booking.status === 'COMPLETED' && !booking.isPaidByCustomer && (
                    <div className="pt-2 space-y-2">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Service completed — awaiting payment from customer
                      </p>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => setPaymentBooking(booking)}
                      >
                        <QrCode className="w-4 h-4" />
                        Show Payment QR to Customer
                      </Button>
                    </div>
                  )}

                  {booking.status === 'COMPLETED' && booking.isPaidByCustomer && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Payment confirmed — ₹{booking.servicePrice} added to your wallet
                      </div>
                      {booking.review ? (
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-1">
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Customer Review</p>
                          <StarDisplay rating={booking.review.rating} />
                          {booking.review.comment && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">"{booking.review.comment}"</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400">No review yet from customer</p>
                      )}
                    </div>
                  )}

                  {booking.status === 'NO_SHOW' && (
                    <p className="text-sm text-neutral-500">Marked as no-show by customer</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Payment QR Popup ─────────────────────────────────────────────────── */}
      <BookingCancellationDialog
        open={!!cancellationBooking}
        title="Cancel Booking"
        description="You may cancel a booking after accepting it. The customer will be notified. Please provide a reason."
        isSubmitting={cancelBookingMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setCancellationBooking(null);
        }}
        onConfirm={(reason) => {
          if (cancellationBooking) {
            cancelBookingMutation.mutate({ id: cancellationBooking.id, reason });
          }
        }}
      />

      <Dialog open={!!paymentBooking} onOpenChange={(open) => { if (!open) setPaymentBooking(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="text-sm text-neutral-500 mb-1">Amount to collect</p>
              <p className="text-4xl font-bold">₹{paymentBooking?.servicePrice ?? 0}</p>
            </div>

            {!paymentInfo ? (
              <p className="text-center text-sm text-neutral-500">Payment info not set up by admin yet.</p>
            ) : (
              <div className="space-y-3">
                {paymentInfo.qrImageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={paymentInfo.qrImageUrl}
                      alt="Payment QR Code"
                      className="w-48 h-48 object-contain border border-neutral-200 dark:border-neutral-700 rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <span className="text-neutral-500">UPI ID</span>
                    <span className="font-medium font-mono">{paymentInfo.upiId}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <span className="text-neutral-500">Name</span>
                    <span className="font-medium">{paymentInfo.upiName}</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 text-center">
                  Ask the customer to scan the QR or use the UPI ID above
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPaymentBooking(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => confirmPaymentMutation.mutate(paymentBooking.id)}
                disabled={confirmPaymentMutation.isPending || !paymentInfo}
              >
                <Wallet className="w-4 h-4" />
                {confirmPaymentMutation.isPending ? 'Confirming…' : 'Payment Received ✓'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </WorkerLayout>
  );
}
