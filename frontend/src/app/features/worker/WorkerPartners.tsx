import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Building2 } from 'lucide-react';
import WorkerLayout from '../../layouts/WorkerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { workerService } from '../../services/api';
import WorkerPartnerProfileCard from './WorkerPartnerProfileCard';

export default function WorkerPartners() {
  const partnerQuery = useQuery({
    queryKey: ['worker-partner-association'],
    queryFn: workerService.getPartnerAssociation,
  });

  return (
    <WorkerLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Partners</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            View the Partner currently associated with your worker profile.
          </p>
        </div>

        {partnerQuery.isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading Partner association…</CardContent></Card>
        ) : partnerQuery.isError ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-red-600">Unable to load your Partner association.</p>
              <Button variant="outline" onClick={() => partnerQuery.refetch()} disabled={partnerQuery.isFetching}>
                {partnerQuery.isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        ) : !partnerQuery.data ? (
          <Card>
            <CardContent className="flex flex-col items-center py-14 text-center">
              <Building2 className="h-10 w-10 text-neutral-300 dark:text-neutral-700" />
              <h2 className="mt-4 font-semibold">No Partner association</h2>
              <p className="mt-1 max-w-md text-sm text-neutral-500">
                Your worker profile is not currently associated with a Partner. Approved Partners manage worker associations; this page is read-only.
              </p>
            </CardContent>
          </Card>
        ) : (
          <WorkerPartnerProfileCard partner={partnerQuery.data} showProfileLink />
        )}

        <Button asChild variant="outline">
          <Link to="/worker">Back to Dashboard</Link>
        </Button>
      </div>
    </WorkerLayout>
  );
}
