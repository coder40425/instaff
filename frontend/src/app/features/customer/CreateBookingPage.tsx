import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import CustomerLayout from '../../layouts/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { bookingService } from '../../services/api';
import type { BookingType, WorkerProfile } from '../../types';
import { CalendarClock, MapPin, Calendar, Timer, IndianRupee, FileText, User, ClipboardList, ArrowRight } from 'lucide-react';

interface BookingForm {
  bookingType: BookingType;
  subCategoryId: string;
  address: string;
  city: string;
  scheduledDate: string;
  durationMinutes: number;
  servicePrice: number;
  notes?: string;
}

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const worker: WorkerProfile | undefined = location.state?.worker;
  const [loading, setLoading] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType>('INSTANT');

  // Worker's skills — each has subCategoryId + subCategory.name
  const workerSkills = worker?.skills ?? [];

  const { register, handleSubmit, control, formState: { errors } } = useForm<BookingForm>({
    defaultValues: {
      bookingType:   'INSTANT',
      subCategoryId: workerSkills[0]?.subCategoryId ?? '',
      scheduledDate: new Date().toISOString().slice(0, 16),
    },
  });

  const onSubmit = async (data: BookingForm) => {
    if (!worker) {
      toast.error('Please select a worker first');
      return;
    }
    if (!data.subCategoryId) {
      toast.error('Please select a service');
      return;
    }

    try {
      setLoading(true);
      // Direct/instant booking — unchanged backend contract, same fields, same shape.
      // This is intentionally the OLD booking flow, kept separate from the new
      // Requirement → Matching → Assignment workflow (see CreateRequirementPage).
      await bookingService.create({
        workerId:        worker.userId,
        bookingType,
        subCategoryId:   data.subCategoryId,
        address:         data.address,
        city:            data.city,
        scheduledDate:   data.scheduledDate,
        durationMinutes: Number(data.durationMinutes),
        servicePrice:    Number(data.servicePrice),
        notes:           data.notes,
      });
      toast.success('Booking request sent to the worker!');
      navigate('/customer/bookings');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto space-y-6 px-1 sm:px-0">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center flex-shrink-0">
            <CalendarClock className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Book This Worker</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm sm:text-base">
              Book directly with this worker for a specific job, right away or on a scheduled date.
            </p>
          </div>
        </div>

        {/* Bridge to the new requirement/hiring flow — for anyone who actually
            wants matching/backups/bulk-hiring instead of a single direct booking. */}
        <Card className="border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Hiring for a role instead of a one-off job?
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Post a requirement to get matched candidates, backups, or hire in bulk.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 flex-shrink-0"
              onClick={() => navigate('/customer/requirements/new', { state: { worker } })}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Post a Requirement
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>

        {/* Selected worker summary */}
        {worker ? (
          <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Booking For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="font-semibold text-lg truncate">{worker.user?.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {[...workerSkills]
                      .sort((a, b) => (a.subCategory?.name ?? '').localeCompare(b.subCategory?.name ?? ''))
                      .map((s) => (
                        <Badge key={s.subCategoryId} variant="secondary" className="text-xs">
                          {s.subCategory?.name}
                        </Badge>
                      ))}
                  </div>
                </div>
                <p className="font-bold text-lg whitespace-nowrap">₹{worker.expectedSalary}<span className="text-xs font-normal text-neutral-500">/mo</span></p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-neutral-300 dark:border-neutral-700">
            <CardContent className="py-6 text-center text-sm text-neutral-500">
              No worker selected. Please go back and choose a worker first.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Booking type */}
              <div className="space-y-2">
                <Label>Booking Type</Label>
                <Select value={bookingType} onValueChange={(v) => setBookingType(v as BookingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSTANT">Instant — worker needed right away</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled — for a future date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Service selection — worker's skills only */}
              <div className="space-y-2">
                <Label htmlFor="subCategoryId">
                  Type of Work <span className="text-red-500">*</span>
                </Label>
                {workerSkills.length === 0 ? (
                  <p className="text-sm text-neutral-500">This worker has no skills listed.</p>
                ) : (
                  <Controller
                    name="subCategoryId"
                    control={control}
                    rules={{ required: 'Please select a service' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose the work needed…" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...workerSkills]
                            .sort((a, b) => (a.subCategory?.name ?? '').localeCompare(b.subCategory?.name ?? ''))
                            .map((skill) => (
                              <SelectItem key={skill.subCategoryId} value={skill.subCategoryId}>
                                {skill.subCategory?.name}
                                {skill.subCategory?.category?.name && (
                                  <span className="text-neutral-400 ml-1 text-xs">
                                    — {skill.subCategory.category.name}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.subCategoryId && (
                  <p className="text-sm text-red-500">{errors.subCategoryId.message}</p>
                )}
              </div>

              {/* Location group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" /> City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...register('city', {
                      required: 'City is required',
                      minLength: { value: 2, message: 'City must be at least 2 characters' },
                    })}
                  />
                  {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledDate" className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    {bookingType === 'SCHEDULED' ? 'Scheduled Date & Time' : 'Date & Time'}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    {...register('scheduledDate', { required: 'Date and time is required' })}
                  />
                  {errors.scheduledDate && <p className="text-sm text-red-500">{errors.scheduledDate.message}</p>}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Service Address <span className="text-red-500">*</span></Label>
                <Textarea
                  id="address"
                  placeholder="Enter the full service address (min 5 characters)"
                  {...register('address', {
                    required: 'Address is required',
                    minLength: { value: 5, message: 'Address must be at least 5 characters' },
                  })}
                />
                {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
              </div>

              {/* Duration + Price group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes" className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-neutral-500" /> Duration (minutes) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    placeholder="e.g. 120 (min 60)"
                    {...register('durationMinutes', {
                      required: 'Duration is required',
                      min: { value: 60, message: 'Minimum duration is 60 minutes' },
                    })}
                  />
                  {errors.durationMinutes && <p className="text-sm text-red-500">{errors.durationMinutes.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servicePrice" className="flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-neutral-500" /> Budget / Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    placeholder="e.g. 500"
                    {...register('servicePrice', {
                      required: 'Price is required',
                      min: { value: 1, message: 'Price must be positive' },
                    })}
                  />
                  {errors.servicePrice && <p className="text-sm text-red-500">{errors.servicePrice.message}</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" /> Additional Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions for the worker…"
                  {...register('notes')}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !worker || workerSkills.length === 0}>
                  {loading ? 'Submitting…' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}