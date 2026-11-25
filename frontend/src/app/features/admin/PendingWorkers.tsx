import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { adminService } from '../../services/api';
import { formatWorkerLocations } from '../../utils/workerLocations';
import {
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  User,
  Globe,
  GraduationCap,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const EDUCATION_LABELS: Record<string, string> = {
  NO_FORMAL_EDUCATION: 'No Formal Education',
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary (10th)',
  HIGHER_SECONDARY: 'Higher Secondary (12th)',
  DIPLOMA: 'Diploma',
  GRADUATE: 'Graduate',
  POST_GRADUATE: 'Post Graduate',
};

export default function PendingWorkers() {
  const queryClient = useQueryClient();
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: workers, isLoading } = useQuery({
    queryKey: ['pending-workers'],
    queryFn: adminService.getPendingWorkers,
  });

  const approveMutation = useMutation({
    // Backend route: PATCH /admin/workers/:userId/approve — must pass userId not profile id
    mutationFn: (userId: string) => adminService.approveWorker(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-workers'] });
      toast.success('Worker approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve worker');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.rejectWorker(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-workers'] });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedWorker(null);
      toast.success('Worker rejected');
    },
    onError: () => {
      toast.error('Failed to reject worker');
    },
  });

  const handleReject = () => {
    if (!selectedWorker || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ userId: selectedWorker.userId, reason: rejectReason });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Workers</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Review and approve worker registrations
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading workers…</div>
        ) : !workers || workers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-neutral-500">No pending workers for verification</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workers.map((worker: any) => {
              const isExpanded = expandedId === worker.id;
              const workerName = worker.user?.name || worker.name;

              return (
                <Card key={worker.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3">
                        {worker.profilePhotoUrl ? (
                          <img
                            src={worker.profilePhotoUrl}
                            alt={workerName}
                            className="w-14 h-14 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                            <User className="w-7 h-7 text-neutral-400" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{workerName}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {worker.skillCategory}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {/* Basic info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <Phone className="w-4 h-4" />
                        <span>{worker.user?.phone || worker.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {formatWorkerLocations(worker) || 'Not specified'}
                        </span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        Experience: {worker.experience || 0} years
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        Expected Salary: ₹{worker.expectedSalary || 0}/month
                      </div>
                      {worker.aadhaarNumber && (
                        <div className="text-neutral-600 dark:text-neutral-400 font-mono">
                          Aadhaar: {worker.aadhaarNumber}
                        </div>
                      )}
                    </div>

                    {/* Expandable extra details */}
                    {isExpanded && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-3 text-sm">
                        {/* Personal */}
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            Personal
                          </p>
                          {worker.gender && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Gender: {worker.gender}
                            </p>
                          )}
                          {worker.dateOfBirth && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              DOB:{' '}
                              {new Date(worker.dateOfBirth).toLocaleDateString('en-IN')}
                            </p>
                          )}
                          {worker.education && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Education:{' '}
                              {EDUCATION_LABELS[worker.education] ?? worker.education}
                            </p>
                          )}
                          {worker.maritalStatus && (
                            <p className="text-neutral-600 dark:text-neutral-400 capitalize">
                              Marital Status: {worker.maritalStatus.toLowerCase()}
                            </p>
                          )}
                          {worker.height && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Height: {worker.height} cm
                            </p>
                          )}
                          {worker.weight && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Weight: {worker.weight} kg
                            </p>
                          )}
                          {worker.languagesKnown && worker.languagesKnown.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {worker.languagesKnown.map((lang: string) => (
                                <Badge key={lang} variant="secondary" className="text-xs">
                                  {lang}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Professional */}
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            Professional
                          </p>
                          {worker.availableTimings && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Timings: {worker.availableTimings}
                            </p>
                          )}
                          {worker.preferredWorkingRadius && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Working Radius: {worker.preferredWorkingRadius} km
                            </p>
                          )}
                          {worker.canRelocate && (
                            <p className="text-neutral-600 dark:text-neutral-400">
                              Willing to Relocate: Yes
                            </p>
                          )}
                          {worker.aboutYourself && (
                            <div>
                              <p className="text-neutral-500">About:</p>
                              <p className="text-neutral-600 dark:text-neutral-300">
                                {worker.aboutYourself}
                              </p>
                            </div>
                          )}
                          {worker.certifications && (
                            <div>
                              <p className="text-neutral-500">Certifications:</p>
                              <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
                                {worker.certifications}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Family & Emergency */}
                        {(worker.fatherName ||
                          worker.motherName ||
                          worker.emergencyContact) && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                              Family &amp; Emergency
                            </p>
                            {worker.fatherName && (
                              <p className="text-neutral-600 dark:text-neutral-400">
                                Father: {worker.fatherName}
                              </p>
                            )}
                            {worker.motherName && (
                              <p className="text-neutral-600 dark:text-neutral-400">
                                Mother: {worker.motherName}
                              </p>
                            )}
                            {worker.emergencyContact && (
                              <p className="text-neutral-600 dark:text-neutral-400">
                                Emergency Contact: {worker.emergencyContact}
                                {worker.emergencyContactNumber
                                  ? ` (${worker.emergencyContactNumber})`
                                  : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : worker.id)}
                      className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Show full profile
                        </>
                      )}
                    </button>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => approveMutation.mutate(worker.userId)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setSelectedWorker(worker);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Reject dialog ──────────────────────────────────────────────────── */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Worker</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Rejection</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject Worker'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
