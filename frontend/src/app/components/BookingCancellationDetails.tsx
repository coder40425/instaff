type BookingCancellationDetailsProps = {
  status: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
};

const actorLabels: Record<string, string> = {
  CUSTOMER: 'Customer',
  WORKER: 'Worker',
  ADMIN: 'Admin',
};

export default function BookingCancellationDetails({
  status,
  cancelledAt,
  cancellationReason,
  cancelledBy,
}: BookingCancellationDetailsProps) {
  if (status !== 'CANCELLED') return null;

  const date = cancelledAt ? new Date(cancelledAt) : null;
  const formattedDate = date && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : null;
  const reason = cancellationReason?.trim();
  const actor = cancelledBy ? actorLabels[cancelledBy] ?? cancelledBy : null;

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="font-medium">Cancellation details</p>
      <p className="mt-1 text-neutral-600 dark:text-neutral-400">
        {[actor ? `Cancelled by ${actor}` : null, formattedDate].filter(Boolean).join(' · ') ||
          'Cancellation details unavailable'}
      </p>
      {reason && (
        <p className="mt-1 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          Reason: {reason}
        </p>
      )}
    </div>
  );
}
