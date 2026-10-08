import { Link } from 'react-router';
import { ArrowRight, Clock3, MapPin, UserRound } from 'lucide-react';
import { Badge } from '../badge';
import { Button } from '../button';
import { Card, CardContent } from '../card';
import type { Requirement, RequirementCandidate, RequirementCandidateStatus } from '../../../types';

export type TrackedPartnerCandidate = RequirementCandidate & {
  status: Extract<RequirementCandidateStatus, 'OFFERED' | 'ASSIGNED' | 'REJECTED'>;
  requirement: Requirement;
};

export const isTrackedPartnerCandidate = (
  candidate: RequirementCandidate
): candidate is TrackedPartnerCandidate =>
  candidate.status === 'OFFERED'
  || candidate.status === 'ASSIGNED'
  || candidate.status === 'REJECTED';

const STATUS_CLASSES: Record<TrackedPartnerCandidate['status'], string> = {
  OFFERED: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  ASSIGNED: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300',
  REJECTED: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
};

export function PartnerAssignmentCard({ assignment }: { assignment: TrackedPartnerCandidate }) {
  const workerName = assignment.workerProfile?.user?.name || 'NearPassway worker';
  const isOffered = assignment.status === 'OFFERED';
  const isAssigned = assignment.status === 'ASSIGNED';

  return (
    <Card>
      <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words font-semibold">{workerName}</h2>
            <Badge variant="outline" className={STATUS_CLASSES[assignment.status]}>
              {isAssigned ? 'Assigned / Confirmed' : isOffered ? 'Offer sent' : 'Rejected'}
            </Badge>
          </div>
          <p className="break-words text-sm text-neutral-600 dark:text-neutral-400">
            {assignment.requirement.subCategory?.name || assignment.requirement.category?.name || 'Worker requirement'}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1 break-words"><MapPin className="h-3.5 w-3.5 flex-shrink-0" />{[assignment.requirement.city, assignment.requirement.state].filter(Boolean).join(', ')}</span>
            <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5 flex-shrink-0" />{assignment.workerProfile?.experience ?? 0} years experience</span>
            {assignment.offeredAt && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 flex-shrink-0" />Offer sent {new Date(assignment.offeredAt).toLocaleDateString('en-IN')}</span>}
            {assignment.acceptedAt && <span>Accepted {new Date(assignment.acceptedAt).toLocaleDateString('en-IN')}</span>}
          </div>
          {isOffered && <p className="break-words text-sm font-medium text-blue-700 dark:text-blue-300">Waiting for worker acceptance; this is not a confirmed assignment.</p>}
          {isAssigned && <p className="break-words text-sm font-medium text-green-700 dark:text-green-300">Worker acceptance received. Assignment is confirmed.</p>}
          {assignment.status === 'REJECTED' && <p className="break-words text-sm text-red-700 dark:text-red-300">The worker rejected this offer.</p>}
        </div>
        <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
          <Link to={`/partner/requirements/${assignment.requirement.id}`}>View requirement <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
