import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { workerService, adminService } from '../../services/api';
import { useState } from 'react';
import { Search, UserX, UserCheck, Star, User, AlertTriangle } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`w-3.5 h-3.5 ${
          s <= Math.round(rating)
            ? 'fill-black dark:fill-white text-black dark:text-white'
            : 'text-neutral-300 dark:text-neutral-600'
        }`}
      />
    ))}
  </div>
);

const EDUCATION_LABELS: Record<string, string> = {
  NO_FORMAL_EDUCATION: 'No Formal Education',
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary (10th)',
  HIGHER_SECONDARY: 'Higher Secondary (12th)',
  DIPLOMA: 'Diploma',
  GRADUATE: 'Graduate',
  POST_GRADUATE: 'Post Graduate',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkerManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Suspend dialog state
  const [suspendTarget, setSuspendTarget] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // NOTE ON DATA SOURCE:
  // `/workers` is the CUSTOMER-SAFE discovery endpoint — the backend always
  // filters isVerified=true & isSuspended=false there, by design. That means
  // this screen, sourced from workerService.getAll(), can only ever show
  // verified, non-suspended workers — it structurally CANNOT show pending or
  // rejected workers. Pending workers already have their own dedicated screen
  // (PendingWorkers.tsx via GET /admin/workers/pending), which we surface a
  // count/link for below.
  //
  // A true "all worker states in one admin table" view (pending + rejected +
  // suspended + active, in a single list with filters) would require a
  // dedicated admin endpoint such as GET /admin/workers that returns every
  // worker regardless of state. That endpoint is NOT present in the supplied
  // backend contract, so it is not implemented here — see the banner below
  // and the final report for the explicit callout.
  const { data: workers, isLoading } = useQuery({
    queryKey: ['all-workers'],
    queryFn: () => workerService.getAll({}),
  });

  const { data: pendingWorkers } = useQuery({
    queryKey: ['pending-workers'],
    queryFn: adminService.getPendingWorkers,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.suspendWorker(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-workers'] });
      toast.success('Worker suspended');
      setSuspendTarget(null);
      setSuspendReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to suspend worker');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => adminService.reactivateWorker(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-workers'] });
      toast.success('Worker reactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reactivate worker');
    },
  });

  const handleSuspendConfirm = () => {
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      toast.error('Please enter a suspension reason');
      return;
    }
    suspendMutation.mutate({ userId: suspendTarget.userId, reason: suspendReason.trim() });
  };

  const filteredWorkers = workers?.filter(
    (worker: any) =>
      worker.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.skillCategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = pendingWorkers?.length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Worker Management</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage verified workers on the platform
          </p>
        </div>

        {/* Explicit callout: this list only shows verified, non-suspended workers,
            because that's all the customer-safe /workers endpoint can return. */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">
                This list shows verified, active workers only.
              </p>
              <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                {pendingCount > 0
                  ? `There ${pendingCount === 1 ? 'is' : 'are'} ${pendingCount} worker${pendingCount === 1 ? '' : 's'} awaiting verification — review them on the `
                  : 'Workers awaiting verification appear on the '}
                <a href="/admin/workers/pending" className="underline font-medium">
                  Pending Workers
                </a>{' '}
                page. Rejected workers are not currently listable from the frontend
                because no backend endpoint returns them.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-neutral-500" />
              <Input
                placeholder="Search by name or skill…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">Loading workers…</div>
        ) : !filteredWorkers || filteredWorkers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-neutral-500">No workers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWorkers.map((worker: any) => {
              const isExpanded = expandedId === worker.id;
              const workerName = worker.user?.name || worker.name;

              return (
                <Card key={worker.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        {worker.profilePhotoUrl ? (
                          <img
                            src={worker.profilePhotoUrl}
                            alt={workerName}
                            className="w-12 h-12 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-neutral-400" />
                          </div>
                        )}
                        <div>
                          <CardTitle>{workerName}</CardTitle>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">{worker.skillCategory}</Badge>
                            {worker.isVerified && (
                              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                                Verified
                              </Badge>
                            )}
                            {worker.isSuspended && (
                              <Badge className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                Suspended
                              </Badge>
                            )}
                            {worker.isAvailable && !worker.isSuspended && (
                              <Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                Available
                              </Badge>
                            )}
                            {worker.canRelocate && (
                              <Badge variant="outline">Can Relocate</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : worker.id)}
                        >
                          {isExpanded ? 'Less' : 'More'}
                        </Button>
                        {!worker.isSuspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSuspendTarget(worker);
                              setSuspendReason('');
                            }}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reactivateMutation.mutate(worker.userId)}
                            disabled={reactivateMutation.isPending}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Core stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Phone</p>
                        <p className="font-medium">
                          {worker.user?.phone || worker.phone || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Location</p>
                        <p className="font-medium">{worker.city || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Experience</p>
                        <p className="font-medium">{worker.experience ?? 0} yrs</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Expected Salary</p>
                        <p className="font-medium">₹{worker.expectedSalary ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Rating</p>
                        {worker.totalReviews > 0 ? (
                          <div className="space-y-0.5">
                            <StarDisplay rating={worker.rating} />
                            <p className="text-xs text-neutral-400">
                              {worker.rating.toFixed(1)} · {worker.totalReviews} review
                              {worker.totalReviews !== 1 ? 's' : ''}
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium text-neutral-400">No reviews</p>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-4">
                        {/* Personal */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                            Personal
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {worker.gender && (
                              <div>
                                <p className="text-neutral-500">Gender</p>
                                <p className="font-medium">{worker.gender}</p>
                              </div>
                            )}
                            {worker.dateOfBirth && (
                              <div>
                                <p className="text-neutral-500">Date of Birth</p>
                                <p className="font-medium">
                                  {new Date(worker.dateOfBirth).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                            )}
                            {worker.height && (
                              <div>
                                <p className="text-neutral-500">Height</p>
                                <p className="font-medium">{worker.height} cm</p>
                              </div>
                            )}
                            {worker.weight && (
                              <div>
                                <p className="text-neutral-500">Weight</p>
                                <p className="font-medium">{worker.weight} kg</p>
                              </div>
                            )}
                            {worker.education && (
                              <div>
                                <p className="text-neutral-500">Education</p>
                                <p className="font-medium">
                                  {EDUCATION_LABELS[worker.education] ?? worker.education}
                                </p>
                              </div>
                            )}
                            {worker.maritalStatus && (
                              <div>
                                <p className="text-neutral-500">Marital Status</p>
                                <p className="font-medium capitalize">
                                  {worker.maritalStatus.toLowerCase()}
                                </p>
                              </div>
                            )}
                          </div>
                          {worker.languagesKnown && worker.languagesKnown.length > 0 && (
                            <div className="mt-2">
                              <p className="text-neutral-500 text-sm mb-1">Languages Known</p>
                              <div className="flex flex-wrap gap-1">
                                {worker.languagesKnown.map((lang: string) => (
                                  <Badge key={lang} variant="secondary" className="text-xs">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Professional */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                            Professional
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {worker.availableTimings && (
                              <div>
                                <p className="text-neutral-500">Available Timings</p>
                                <p className="font-medium">{worker.availableTimings}</p>
                              </div>
                            )}
                            {worker.preferredWorkingRadius && (
                              <div>
                                <p className="text-neutral-500">Working Radius</p>
                                <p className="font-medium">{worker.preferredWorkingRadius} km</p>
                              </div>
                            )}
                          </div>
                          {worker.aboutYourself && (
                            <div className="mt-2">
                              <p className="text-neutral-500 text-sm">About</p>
                              <p className="text-sm mt-1">{worker.aboutYourself}</p>
                            </div>
                          )}
                          {worker.previousCompanies && (
                            <div className="mt-2">
                              <p className="text-neutral-500 text-sm">Previous Companies</p>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {worker.previousCompanies}
                              </p>
                            </div>
                          )}
                          {worker.certifications && (
                            <div className="mt-2">
                              <p className="text-neutral-500 text-sm">Certifications</p>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {worker.certifications}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Family & Emergency */}
                        {(worker.fatherName ||
                          worker.motherName ||
                          worker.emergencyContact) && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                              Family &amp; Emergency
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {worker.fatherName && (
                                <div>
                                  <p className="text-neutral-500">Father's Name</p>
                                  <p className="font-medium">{worker.fatherName}</p>
                                </div>
                              )}
                              {worker.motherName && (
                                <div>
                                  <p className="text-neutral-500">Mother's Name</p>
                                  <p className="font-medium">{worker.motherName}</p>
                                </div>
                              )}
                              {worker.emergencyContact && (
                                <div>
                                  <p className="text-neutral-500">Emergency Contact</p>
                                  <p className="font-medium">{worker.emergencyContact}</p>
                                </div>
                              )}
                              {worker.emergencyContactNumber && (
                                <div>
                                  <p className="text-neutral-500">Emergency Number</p>
                                  <p className="font-medium">{worker.emergencyContactNumber}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Documents */}
                        {worker.aadhaarNumber && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                              Documents
                            </p>
                            <p className="text-sm">
                              <span className="text-neutral-500">Aadhaar: </span>
                              <span className="font-medium font-mono">{worker.aadhaarNumber}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suspension reason */}
                    {worker.isSuspended && worker.suspensionReason && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                        <strong>Suspension reason:</strong> {worker.suspensionReason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Suspend dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!suspendTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendTarget(null);
            setSuspendReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You are about to suspend{' '}
              <strong>{suspendTarget?.user?.name ?? suspendTarget?.name}</strong>. They will not
              be able to receive new bookings.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="suspendReason">
                Suspension Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="suspendReason"
                placeholder="Enter reason for suspension…"
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSuspendTarget(null);
                  setSuspendReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleSuspendConfirm}
                disabled={suspendMutation.isPending}
              >
                {suspendMutation.isPending ? 'Suspending…' : 'Confirm Suspend'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}