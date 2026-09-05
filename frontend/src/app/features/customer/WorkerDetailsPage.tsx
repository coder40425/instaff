import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import CustomerLayout from '../../layouts/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { workerService, reviewService } from '../../services/api';
import {
  Star,
  MapPin,
  Phone,
  CheckCircle,
  User,
  Clock,
  Globe,
  GraduationCap,
  Heart,
  Ruler,
  Weight,
  Building2,
  Award,
  Navigation,
  ClipboardList,
} from 'lucide-react';

// ── Small helper components ───────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 text-neutral-500 flex-shrink-0" />
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

const EDUCATION_LABELS: Record<string, string> = {
  NO_FORMAL_EDUCATION: 'No Formal Education',
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary (10th)',
  HIGHER_SECONDARY: 'Higher Secondary (12th)',
  DIPLOMA: 'Diploma',
  GRADUATE: 'Graduate',
  POST_GRADUATE: 'Post Graduate',
};

const MARITAL_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // workerService.getById returns null for 404 AND for any unverified/suspended
  // worker that might unexpectedly slip through — both cases render the same
  // "not found / unavailable" state to the customer, never the profile itself.
  const { data: worker, isLoading, isError } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => workerService.getById(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['worker-reviews', id],
    queryFn: () => reviewService.getWorkerReviews(id!),
    enabled: !!id && !!worker,
  });

  const reviews = Array.isArray(reviewsData)
    ? reviewsData
    : reviewsData?.data || [];

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="text-center py-12 text-neutral-500">Loading worker details…</div>
      </CustomerLayout>
    );
  }

  if (isError || !worker) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
          <p className="text-neutral-700 dark:text-neutral-300 font-semibold text-lg">
            Worker not found / unavailable
          </p>
          <p className="text-neutral-500 text-sm">
            This worker profile doesn't exist or is no longer available.
          </p>
          <Button variant="outline" onClick={() => navigate('/customer/home')}>
            Back to Worker Directory
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const workerName = worker.user?.name;
  const workerPhone = worker.user?.phone;

  // skills[] presented A-Z, per requirement
  const sortedSkills = [...(worker.skills ?? [])].sort((a, b) =>
    (a.subCategory?.name ?? '').localeCompare(b.subCategory?.name ?? '')
  );
  const primaryCategoryName = sortedSkills[0]?.subCategory?.category?.name;

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-1 sm:px-0">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          ← Back
        </Button>

        {/* ── Hero card ──────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0 flex sm:block justify-center">
                {worker.profilePhotoUrl ? (
                  <img
                    src={worker.profilePhotoUrl}
                    alt={workerName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-700"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <User className="w-10 h-10 text-neutral-400" />
                  </div>
                )}
              </div>

              {/* Core info */}
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{workerName}</h1>
                  {primaryCategoryName && (
                    <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 mt-1">
                      {primaryCategoryName}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {worker.isVerified && (
                    <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  <Badge variant="secondary">{worker.experience} years experience</Badge>
                  {worker.canRelocate && (
                    <Badge variant="outline">Can Relocate</Badge>
                  )}
                  {worker.isAvailable && (
                    <Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      Available
                    </Badge>
                  )}
                </div>

                {/* Skills list — A-Z */}
                {sortedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                    {sortedSkills.map((s) => (
                      <Badge key={s.id} variant="secondary" className="text-xs">
                        {s.subCategory?.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-left">
                  <div>
                    <p className="text-xs text-neutral-500">Rating</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{worker.rating || 0}/5</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Location</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold text-sm">
                        {worker.city}{worker.state ? `, ${worker.state}` : ''}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Phone</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-4 h-4" />
                      <span className="font-semibold text-sm">{workerPhone}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Expected Salary</p>
                    <span className="font-semibold">₹{worker.expectedSalary}/month</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full sm:w-auto mt-4 gap-2"
                  onClick={() => navigate('/booking/create', { state: { worker } })}
                >
                  <ClipboardList className="w-4 h-4" />
                  Create Requirement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── About ──────────────────────────────────────────────────────────── */}
        {worker.aboutYourself && (
          <SectionCard title="About">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {worker.aboutYourself}
            </p>
          </SectionCard>
        )}

        {/* ── Personal details ───────────────────────────────────────────────── */}
        <SectionCard title="Personal Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={User}         label="Gender"         value={worker.gender} />
            <InfoRow
              icon={User}
              label="Date of Birth"
              value={
                worker.dateOfBirth
                  ? new Date(worker.dateOfBirth).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : null
              }
            />
            <InfoRow icon={Ruler}        label="Height"         value={worker.height ? `${worker.height} cm` : null} />
            <InfoRow icon={Weight}       label="Weight"         value={worker.weight ? `${worker.weight} kg` : null} />
            <InfoRow icon={GraduationCap} label="Education"     value={worker.education ? (EDUCATION_LABELS[worker.education] ?? worker.education) : null} />
            <InfoRow icon={Heart}        label="Marital Status" value={worker.maritalStatus ? (MARITAL_LABELS[worker.maritalStatus] ?? worker.maritalStatus) : null} />
          </div>

          {worker.languagesKnown && worker.languagesKnown.length > 0 && (
            <InfoRow
              icon={Globe}
              label="Languages Known"
              value={
                <div className="flex flex-wrap gap-1 mt-1">
                  {[...worker.languagesKnown].sort((a, b) => a.localeCompare(b)).map((lang: string) => (
                    <Badge key={lang} variant="secondary" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>
              }
            />
          )}
        </SectionCard>

        {/* ── Professional details ───────────────────────────────────────────── */}
        <SectionCard title="Professional Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={Clock}      label="Available Timings"       value={worker.availableTimings} />
            <InfoRow icon={Navigation} label="Preferred Working Radius" value={worker.preferredWorkingRadius ? `${worker.preferredWorkingRadius} km` : null} />
          </div>

          {worker.previousCompanies && (
            <InfoRow
              icon={Building2}
              label="Previous Companies / Employers"
              value={<span className="whitespace-pre-wrap">{worker.previousCompanies}</span>}
            />
          )}

          {worker.certifications && (
            <InfoRow
              icon={Award}
              label="Certifications"
              value={<span className="whitespace-pre-wrap">{worker.certifications}</span>}
            />
          )}
        </SectionCard>

        {/* ── Reviews ────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              Reviews{' '}
              {reviews.length > 0 && (
                <span className="text-sm font-normal text-neutral-500">
                  ({reviews.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-center text-neutral-500 py-6">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-sm text-neutral-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300">{review.comment}</p>
                    <p className="text-sm text-neutral-500 mt-2">— {review.customer?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}