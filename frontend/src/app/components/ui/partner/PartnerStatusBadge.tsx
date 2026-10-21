import { Badge } from '../badge';
import type { PartnerStatus, PartnerWorkerOperationalStatus } from '../../../types/partner';

const STATUS_CLASSES: Record<PartnerStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  APPROVED: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300',
  REJECTED: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  SUSPENDED: 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge variant="outline" className={STATUS_CLASSES[status]}>{label}</Badge>;
}

const WORKER_STATUS_CLASSES: Record<PartnerWorkerOperationalStatus, string> = {
  AVAILABLE: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300',
  BUSY: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  ON_DUTY: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  OFFLINE: 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  SUSPENDED: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
};

const WORKER_STATUS_LABELS: Record<PartnerWorkerOperationalStatus, string> = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  ON_DUTY: 'On Duty',
  OFFLINE: 'Offline',
  SUSPENDED: 'Suspended',
};

export function PartnerWorkerStatusBadge({ status }: { status: PartnerWorkerOperationalStatus | null }) {
  if (!status) return null;
  return (
    <Badge variant="outline" className={WORKER_STATUS_CLASSES[status]}>
      {WORKER_STATUS_LABELS[status]}
    </Badge>
  );
}
