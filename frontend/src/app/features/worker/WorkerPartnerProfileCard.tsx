import { Link } from 'react-router';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { WorkerPartnerAssociation } from '../../types';

const formatPartnerType = (partnerType: string) =>
  partnerType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function WorkerPartnerProfileCard({
  partner,
  showProfileLink = false,
}: {
  partner: WorkerPartnerAssociation;
  showProfileLink?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle>{partner.displayName}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Associated</Badge>
            <Badge variant={partner.status === 'APPROVED' ? 'default' : 'outline'}>
              Partner {partner.status.toLowerCase()}
            </Badge>
          </div>
        </div>
        {showProfileLink && (
          <Button asChild variant="outline" size="sm">
            <Link to="/worker/partners/profile">View Profile</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-neutral-500">Partner type</p>
          <p className="mt-1 font-medium">{formatPartnerType(partner.partnerType)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Registered</p>
          <p className="mt-1 font-medium">
            {new Date(partner.registeredAt).toLocaleDateString('en-IN')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
