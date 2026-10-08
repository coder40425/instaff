import { Link } from 'react-router';
import { CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { Badge } from '../badge';
import { Button } from '../button';
import { Card, CardContent } from '../card';
import type { Requirement, RequirementStatus } from '../../../types';

const STATUS_CLASSES: Record<RequirementStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  MATCHING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  FILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED: 'bg-black text-white dark:bg-white dark:text-black',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  EXPIRED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

export function PartnerRequirementCard({ requirement }: { requirement: Requirement }) {
  const confirmed = requirement.candidates?.filter((candidate) => candidate.status === 'ASSIGNED').length ?? 0;
  const pendingOffers = requirement.candidates?.filter((candidate) => candidate.status === 'OFFERED').length ?? 0;

  return (
    <Card>
      <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words font-semibold">{requirement.subCategory?.name || requirement.category?.name || 'Worker requirement'}</h2>
            <Badge className={STATUS_CLASSES[requirement.status]}>{requirement.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5 break-words"><MapPin className="h-4 w-4 flex-shrink-0" />{[requirement.city, requirement.state].filter(Boolean).join(', ')}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 flex-shrink-0" />Starts {new Date(requirement.joiningDate).toLocaleDateString('en-IN')}</span>
            <span className="inline-flex items-center gap-1.5"><UsersRound className="h-4 w-4 flex-shrink-0" />{requirement.requiredWorkerCount} required</span>
          </div>
          <p className="break-words text-xs text-neutral-500 dark:text-neutral-400">
            {confirmed} accepted and assigned{pendingOffers ? ` · ${pendingOffers} offer${pendingOffers === 1 ? '' : 's'} awaiting response` : ''}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
          <Link to={`/partner/requirements/${requirement.id}`}>View requirement</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
