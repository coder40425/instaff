import { MapPin, Star, UserRound } from 'lucide-react';
import { Badge } from '../badge';
import { Button } from '../button';
import { Card, CardContent } from '../card';
import type { PartnerAssociatedWorker } from '../../../types/partner';
import { PartnerWorkerStatusBadge } from './PartnerStatusBadge';

export function PartnerWorkerCard({
  worker,
  onRemove,
}: {
  worker: PartnerAssociatedWorker;
  onRemove: () => void;
}) {
  const name = worker.user?.name || 'NearPassway worker';
  const skills = (worker.skills ?? [])
    .map((skill) => skill.subCategory?.name)
    .filter((skill): skill is string => Boolean(skill));

  return (
    <Card className="min-w-0">
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          {worker.profilePhotoUrl ? (
            <img src={worker.profilePhotoUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <UserRound className="h-5 w-5 text-neutral-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold">{name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{worker.experience} yrs experience</span>
              {worker.rating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />{worker.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={worker.isVerified
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'}>
            {worker.isVerified ? 'Verified' : 'Verification pending'}
          </Badge>
          <PartnerWorkerStatusBadge status={worker.operationalStatus} />
        </div>

        {(worker.city || worker.state) && (
          <p className="flex items-center gap-1.5 break-words text-sm text-neutral-600 dark:text-neutral-400">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            {[worker.city, worker.state].filter(Boolean).join(', ')}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {skills.length ? skills.slice(0, 6).map((skill, index) => (
            <Badge key={`${worker.id}-${skill}-${index}`} variant="secondary" className="max-w-full break-words font-normal">
              {skill}
            </Badge>
          )) : <span className="text-xs text-neutral-500">No public skills listed</span>}
        </div>

        <div className="mt-auto border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <Button variant="outline" size="sm" className="w-full" onClick={onRemove}>Remove association</Button>
        </div>
      </CardContent>
    </Card>
  );
}
