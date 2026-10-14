import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

type BookingCancellationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
};

export default function BookingCancellationDialog({
  open,
  title,
  description,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: BookingCancellationDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const trimmedReason = reason.trim();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedReason || isSubmitting) return;
    onConfirm(trimmedReason);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>

          <div className="space-y-2">
            <Label htmlFor="booking-cancellation-reason">Reason for cancellation</Label>
            <Textarea
              id="booking-cancellation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter a short reason"
              rows={3}
              required
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Go back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !trimmedReason}
            >
              {isSubmitting ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
