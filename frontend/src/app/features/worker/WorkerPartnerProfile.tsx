import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import WorkerLayout from '../../layouts/WorkerLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { workerService } from '../../services/api';
import WorkerPartnerProfileCard from './WorkerPartnerProfileCard';

export default function WorkerPartnerProfile() {
  const partnerQuery = useQuery({
    queryKey: ['worker-partner-association'],
    queryFn: workerService.getPartnerAssociation,
  });

  return (
    <WorkerLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Partner Profile</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Safe profile details for the Partner associated with your worker account.
          </p>
        </div>

        {partnerQuery.isLoading ? (
          <Card><CardContent className="py-12 text-center text-neutral-500">Loading Partner profile…</CardContent></Card>
        ) : partnerQuery.isError ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-red-600">Unable to load the Partner profile.</p>
              <Button variant="outline" onClick={() => partnerQuery.refetch()} disabled={partnerQuery.isFetching}>
                {partnerQuery.isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        ) : !partnerQuery.data ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              No Partner is associated with your worker profile.
            </CardContent>
          </Card>
        ) : (
          <>
            <WorkerPartnerProfileCard partner={partnerQuery.data} />
            <p className="text-sm text-neutral-500">
              This Partner profile does not include private contact or account details.
            </p>
          </>
        )}

        <Button asChild variant="outline">
          <Link to="/worker/partners">Back to My Partners</Link>
        </Button>
      </div>
    </WorkerLayout>
  );
}
