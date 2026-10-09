import { Badge } from '../badge';
import type { PartnerStatus } from '../../../types/partner';

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
