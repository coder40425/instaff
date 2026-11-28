import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import CustomerLayout from '../../layouts/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { bookingService, categoryService, getCustomerVisibleSubCategoryIds, isCustomerVisibleSubCategory } from '../../services/api';
import type { BookingType, Category, CreateBookingRequest, PublicWorkerProfile, ServiceFormat } from '../../types';
import { CalendarClock, MapPin, Calendar, Timer, IndianRupee, FileText, User, ClipboardList, ArrowRight, Plus, Trash2 } from 'lucide-react';

interface BookingForm {
  bookingType: BookingType;
  subCategoryId: string;
  address: string;
  city: string;
  servicePrice: number;
  notes?: string;
}

interface VisitDraft { date: string; time: string; durationMinutes: number; }

const serviceFormats: { value: ServiceFormat; label: string; description: string }[] = [
  { value: 'ONE_TIME', label: 'One-Time', description: 'One service appointment.' },
  { value: 'HOURLY', label: 'Hourly', description: 'One appointment with a duration in hours.' },
  { value: 'SESSION', label: 'Session', description: 'One scheduled session.' },
  { value: 'DAILY', label: 'Daily', description: 'One day of service.' },
  { value: 'MULTIPLE_VISITS', label: 'Multiple Visits', description: 'Choose several separate appointments.' },
  { value: 'WEEKLY', label: 'Weekly', description: 'Repeat on a selected weekday.' },
  { value: 'MONTHLY', label: 'Monthly', description: 'Repeat on a selected day of the month.' },
];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const localDateTime = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const localToIso = (date: string, time: string) => {
  const value = new Date(`${date}T${time}`);
  if (!Number.isFinite(value.getTime())) throw new Error('Enter a valid visit date and time');
  return value.toISOString();
};

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const worker: PublicWorkerProfile | undefined = location.state?.worker;
  const [requestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewPayload, setReviewPayload] = useState<CreateBookingRequest | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('INSTANT');
  const [serviceFormat, setServiceFormat] = useState<ServiceFormat>('ONE_TIME');
  const [visits, setVisits] = useState<VisitDraft[]>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return [
      { date: localDate(tomorrow), time: '10:00', durationMinutes: 60 },
      { date: localDate(tomorrow), time: '11:00', durationMinutes: 60 },
    ];
  });
  const [singleDate, setSingleDate] = useState(localDate(new Date(Date.now() + 15 * 60000)));
  const [singleTime, setSingleTime] = useState(localDateTime(new Date(Date.now() + 15 * 60000)).slice(11, 16));
  const [singleDuration, setSingleDuration] = useState('60');
  const [recurrenceStart, setRecurrenceStart] = useState(localDate(new Date(Date.now() + 86400000)));
  const [recurrenceTime, setRecurrenceTime] = useState('10:00');
  const [recurrenceDuration, setRecurrenceDuration] = useState('60');
  const [weekday, setWeekday] = useState(String(new Date(Date.now() + 86400000).getDay()));
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date(Date.now() + 86400000).getDate()));
  const [recurrenceLimit, setRecurrenceLimit] = useState<'count' | 'endDate'>('count');
  const [occurrenceCount, setOccurrenceCount] = useState('4');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const workerSkills = worker?.skills ?? [];
  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['categories', 'visible', 'sequence'],
    queryFn: () => categoryService.getVisible('sequence'),
  });
  const visibleSubCategoryIds = getCustomerVisibleSubCategoryIds(categoriesQuery.data ?? []);
  const visibleWorkerSkills = workerSkills.filter((skill) => isCustomerVisibleSubCategory(skill.subCategory, visibleSubCategoryIds));
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<BookingForm>({
    defaultValues: { bookingType: 'INSTANT', subCategoryId: visibleWorkerSkills[0]?.subCategoryId ?? '' },
  });
  const selectedSubCategoryId = watch('subCategoryId');
  const selectedSkill = useMemo(() => visibleWorkerSkills.find((skill) => skill.subCategoryId === selectedSubCategoryId), [visibleWorkerSkills, selectedSubCategoryId]);
  const selectedFormat = serviceFormats.find((item) => item.value === serviceFormat)!;

  useEffect(() => {
    if (categoriesQuery.isSuccess && !selectedSubCategoryId && visibleWorkerSkills[0]) setValue('subCategoryId', visibleWorkerSkills[0].subCategoryId);
  }, [categoriesQuery.isSuccess, selectedSubCategoryId, setValue, visibleWorkerSkills]);

  const buildPayload = (data: BookingForm) => {
    if (!worker) throw new Error('Please select a worker from the directory first');
    if (!data.subCategoryId || !visibleWorkerSkills.some((skill) => skill.subCategoryId === data.subCategoryId)) throw new Error('Choose a service offered by this worker');
    if (!categoriesQuery.isSuccess) throw new Error('Service availability could not be checked. Please try again.');

    const common = {
      requestId,
      workerId: worker.userId,
      bookingType,
      subCategoryId: data.subCategoryId,
      address: data.address.trim(),
      city: data.city.trim(),
      servicePrice: Number(data.servicePrice),
      notes: data.notes?.trim() || undefined,
      serviceFormat,
    } as const;

    if (serviceFormat === 'MULTIPLE_VISITS') {
      const schedule = visits.map((visit) => ({
        scheduledDate: localToIso(visit.date, visit.time),
        durationMinutes: Number(visit.durationMinutes),
      }));
      if (schedule.length < 2) throw new Error('Add at least two visits');
      if (schedule.some((visit) => !Number.isInteger(visit.durationMinutes) || visit.durationMinutes <= 0)) throw new Error('Each visit needs a positive whole number of minutes');
      if (schedule.some((visit) => visit.scheduledDate && new Date(visit.scheduledDate).getTime() < Date.now())) throw new Error('Visit dates cannot be in the past');
      if (new Set(schedule.map((visit) => visit.scheduledDate)).size !== schedule.length) throw new Error('Each visit must have a different date and time');
      return { ...common, visits: schedule };
    }

    if (serviceFormat === 'WEEKLY' || serviceFormat === 'MONTHLY') {
      if (recurrenceStart < localDate()) throw new Error('Start date cannot be in the past');
      if (!Number.isInteger(Number(recurrenceDuration)) || Number(recurrenceDuration) <= 0) throw new Error('Visit duration must be a positive whole number of minutes');
      if (recurrenceLimit === 'count') {
        const count = Number(occurrenceCount);
        if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Choose between 1 and 100 visits');
      } else if (!recurrenceEndDate || recurrenceEndDate < recurrenceStart) {
        throw new Error('End date must be on or after the start date');
      }
      return {
        ...common,
        schedule: {
          startDate: recurrenceStart,
          visitTime: recurrenceTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          durationMinutes: Number(recurrenceDuration),
          ...(serviceFormat === 'WEEKLY' ? { weekday: Number(weekday) } : { dayOfMonth: Number(dayOfMonth) }),
          ...(recurrenceLimit === 'count' ? { occurrenceCount: Number(occurrenceCount) } : { endDate: recurrenceEndDate }),
        },
      };
    }

    const isHourly = serviceFormat === 'HOURLY';
    const durationMinutes = isHourly ? Number(singleDuration) * 60 : Number(singleDuration);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) throw new Error(isHourly ? 'Enter hours in quarter-hour increments' : 'Duration must be a positive number of minutes');
    if (isHourly && (Number(singleDuration) * 4) % 1 !== 0) throw new Error('Enter hours in quarter-hour increments');
    if (serviceFormat === 'ONE_TIME' && durationMinutes < 60) throw new Error('One-Time bookings must be at least 60 minutes');
    const scheduledDate = localToIso(singleDate, singleTime);
    if (new Date(scheduledDate).getTime() < Date.now()) throw new Error('Booking date and time cannot be in the past');
    return { ...common, scheduledDate, durationMinutes };
  };

  const onReview = (data: BookingForm) => {
    try { setReviewPayload(buildPayload(data)); setReviewing(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Check your booking details'); }
  };

  const onConfirm = async () => {
    if (!reviewPayload) return;
    try {
      setLoading(true);
      await bookingService.create(reviewPayload);
      toast.success('Booking request sent to the worker!');
      navigate('/customer/bookings');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to submit booking');
    } finally { setLoading(false); }
  };

  const scheduleSummary = () => {
    if (serviceFormat === 'MULTIPLE_VISITS') return `${visits.length} separate visits`;
    if (serviceFormat === 'WEEKLY' || serviceFormat === 'MONTHLY') {
      const timing = serviceFormat === 'WEEKLY' ? `Every ${weekdayNames[Number(weekday)]}` : `Day ${dayOfMonth} of each month (clamped to month end when needed)`;
      const until = recurrenceLimit === 'count' ? `${occurrenceCount} visits` : `through ${recurrenceEndDate}`;
      return `${timing}, starting ${recurrenceStart} at ${recurrenceTime}, ${until}`;
    }
    const duration = serviceFormat === 'HOURLY' ? `${singleDuration} hours` : `${singleDuration} minutes`;
    return `${singleDate} at ${singleTime}, ${duration}`;
  };

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto space-y-6 px-1 sm:px-0">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center"><CalendarClock className="w-5 h-5" /></div>
          <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Book a Service</h1><p className="text-neutral-600 dark:text-neutral-400 mt-1">Choose a service format and schedule it with your selected worker.</p></div>
        </div>

        <Card className="border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><p className="text-sm font-medium">Hiring for an ongoing role?</p><p className="text-xs text-neutral-500 mt-0.5">Use Regular Employment requirements for role-based hiring.</p></div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/customer/requirements/new', { state: { worker } })}><ClipboardList className="w-3.5 h-3.5" />Create Requirement<ArrowRight className="w-3.5 h-3.5" /></Button>
          </CardContent>
        </Card>

        {worker ? <Card><CardHeader className="pb-3"><CardTitle className="text-sm text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Selected Worker</CardTitle></CardHeader><CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-semibold text-lg">{worker.user?.name}</p><div className="flex flex-wrap gap-1 mt-1">{visibleWorkerSkills.map((skill) => <Badge key={skill.subCategoryId} variant="secondary">{skill.subCategory?.name}</Badge>)}</div></div><Button variant="outline" size="sm" onClick={() => navigate('/customer/home')}>Choose another worker</Button></CardContent></Card> : <Card><CardContent className="py-6 text-center space-y-3"><p className="text-sm text-neutral-500">Select a worker from the directory before creating a booking.</p><Button onClick={() => navigate('/customer/home')}>Open Worker Directory</Button></CardContent></Card>}

        <Card><CardHeader><CardTitle className="text-lg">Booking Details</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit(onReview)}>
            <fieldset disabled={reviewing} className="space-y-6">
            <section className="space-y-3"><h2 className="font-semibold">1. Choose service format</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{serviceFormats.map((format) => <button type="button" key={format.value} onClick={() => { if (format.value !== serviceFormat) setSingleDuration(format.value === 'HOURLY' ? '1' : '60'); setServiceFormat(format.value); setReviewing(false); }} className={`text-left rounded-lg border p-3 ${serviceFormat === format.value ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' : 'border-neutral-200 dark:border-neutral-700'}`}><span className="font-medium">{format.label}</span><span className="block text-xs text-neutral-500 mt-1">{format.description}</span></button>)}</div></section>

            <section className="space-y-3">
              <h2 className="font-semibold">2. Choose service and worker</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service category / subcategory *</Label>
                  {categoriesQuery.isLoading ? <p className="text-sm text-neutral-500">Loading services…</p> : categoriesQuery.isError ? <p className="text-sm text-red-600">Services could not be loaded. Refresh and try again.</p> : (
                    <Controller
                      name="subCategoryId"
                      control={control}
                      rules={{ required: 'Please select a service' }}
                      render={({ field }) => (
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Choose a service" /></SelectTrigger>
                          <SelectContent>
                            {visibleWorkerSkills.map((skill) => (
                              <SelectItem key={skill.subCategoryId} value={skill.subCategoryId}>
                                {skill.subCategory?.category?.name ? `${skill.subCategory.category.name} — ` : ''}{skill.subCategory?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                  {errors.subCategoryId && <p className="text-sm text-red-500">{errors.subCategoryId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Booking type</Label>
                  <Select value={bookingType} onValueChange={(value) => setBookingType(value as BookingType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="INSTANT">Instant request</SelectItem><SelectItem value="SCHEDULED">Scheduled request</SelectItem></SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500">Booking type is separate from the service format.</p>
                </div>
              </div>
            </section>

            <section className="space-y-3"><h2 className="font-semibold">3. Set the schedule</h2>
              {serviceFormat === 'MULTIPLE_VISITS' ? <div className="space-y-3">{visits.map((visit, index) => <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-lg border p-3"><div className="space-y-1"><Label>Visit {index + 1} date</Label><Input type="date" min={localDate()} value={visit.date} onChange={(event) => setVisits((items) => items.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} /></div><div className="space-y-1"><Label>Start time</Label><Input type="time" value={visit.time} onChange={(event) => setVisits((items) => items.map((item, i) => i === index ? { ...item, time: event.target.value } : item))} /></div><div className="space-y-1"><Label>Duration (minutes)</Label><Input type="number" min="1" step="1" value={visit.durationMinutes} onChange={(event) => setVisits((items) => items.map((item, i) => i === index ? { ...item, durationMinutes: Number(event.target.value) } : item))} /></div><Button type="button" variant="outline" size="icon" aria-label={`Remove visit ${index + 1}`} disabled={visits.length <= 2} onClick={() => setVisits((items) => items.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4" /></Button></div>)}<Button type="button" variant="outline" className="gap-2" disabled={visits.length >= 100} onClick={() => setVisits((items) => [...items, { date: localDate(new Date(Date.now() + 86400000)), time: '12:00', durationMinutes: 60 }])}><Plus className="w-4 h-4" />Add visit</Button></div>
              : serviceFormat === 'WEEKLY' || serviceFormat === 'MONTHLY' ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Start date</Label><Input type="date" min={localDate()} value={recurrenceStart} onChange={(event) => setRecurrenceStart(event.target.value)} /></div><div className="space-y-2"><Label>Visit time</Label><Input type="time" value={recurrenceTime} onChange={(event) => setRecurrenceTime(event.target.value)} /></div>{serviceFormat === 'WEEKLY' ? <div className="space-y-2"><Label>Repeat on</Label><select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={weekday} onChange={(event) => setWeekday(event.target.value)}>{weekdayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div> : <div className="space-y-2"><Label>Day of month</Label><Input type="number" min="1" max="31" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} /><p className="text-xs text-neutral-500">If a month is shorter, the visit is on that month's last day.</p></div>}<div className="space-y-2"><Label>Duration (minutes per visit)</Label><Input type="number" min="1" step="1" value={recurrenceDuration} onChange={(event) => setRecurrenceDuration(event.target.value)} /></div><div className="space-y-2"><Label>Repeat until</Label><Select value={recurrenceLimit} onValueChange={(value) => setRecurrenceLimit(value as 'count' | 'endDate')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="count">Number of visits</SelectItem><SelectItem value="endDate">End date</SelectItem></SelectContent></Select></div>{recurrenceLimit === 'count' ? <div className="space-y-2"><Label>Number of visits (max 100)</Label><Input type="number" min="1" max="100" value={occurrenceCount} onChange={(event) => setOccurrenceCount(event.target.value)} /></div> : <div className="space-y-2"><Label>End date (inclusive)</Label><Input type="date" min={recurrenceStart || localDate()} value={recurrenceEndDate} onChange={(event) => setRecurrenceEndDate(event.target.value)} /></div>}</div>
              : <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="space-y-2"><Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Date</Label><Input type="date" min={localDate()} value={singleDate} onChange={(event) => setSingleDate(event.target.value)} /></div><div className="space-y-2"><Label>Start time</Label><Input type="time" value={singleTime} onChange={(event) => setSingleTime(event.target.value)} /></div><div className="space-y-2"><Label className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" />{serviceFormat === 'HOURLY' ? 'Duration (hours)' : 'Duration (minutes)'}</Label><Input type="number" min={serviceFormat === 'HOURLY' ? '0.25' : serviceFormat === 'ONE_TIME' ? '60' : '1'} step={serviceFormat === 'HOURLY' ? '0.25' : '1'} value={singleDuration} onChange={(event) => setSingleDuration(event.target.value)} />{serviceFormat === 'HOURLY' && <p className="text-xs text-neutral-500">Quarter-hour increments are converted to minutes.</p>}{serviceFormat === 'ONE_TIME' && <p className="text-xs text-neutral-500">One-Time bookings require at least 60 minutes.</p>}</div></div>}
            </section>

            <section className="space-y-3"><h2 className="font-semibold">4. Service location and total price</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />City *</Label><Input {...register('city', { required: 'City is required', minLength: { value: 2, message: 'City must be at least 2 characters' } })} placeholder="Enter city" />{errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}</div><div className="space-y-2"><Label className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />Total booking price *</Label><Input type="number" min="0.01" step="0.01" {...register('servicePrice', { valueAsNumber: true, required: 'Price is required', min: { value: 0.01, message: 'Price must be positive' } })} placeholder="Enter total price for the complete booking" />{errors.servicePrice && <p className="text-sm text-red-500">{errors.servicePrice.message}</p>}<p className="text-xs text-neutral-500">This is the total for the entire booking, including all visits.</p></div></div><div className="space-y-2"><Label>Service address *</Label><Textarea {...register('address', { required: 'Address is required', minLength: { value: 5, message: 'Address must be at least 5 characters' } })} placeholder="Enter the full service address" />{errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}</div><div className="space-y-2"><Label className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Notes (optional)</Label><Textarea {...register('notes')} placeholder="Special instructions for the worker" /></div></section>

            </fieldset>
            {reviewing && <Card className="bg-neutral-50 dark:bg-neutral-900"><CardHeader className="pb-2"><CardTitle className="text-base">Review your booking</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Worker:</strong> {worker?.user?.name}</p><p><strong>Service:</strong> {selectedSkill?.subCategory?.category?.name ? `${selectedSkill.subCategory.category.name} — ` : ''}{selectedSkill?.subCategory?.name}</p><p><strong>Format:</strong> {selectedFormat.label}</p><p><strong>Schedule:</strong> {scheduleSummary()}</p>{serviceFormat === 'MULTIPLE_VISITS' && <ol className="list-decimal pl-5 pt-1 space-y-1">{visits.map((visit, index) => <li key={index}>Visit {index + 1}: {visit.date} at {visit.time}, {visit.durationMinutes} minutes</li>)}</ol>}<p><strong>Total booking price:</strong> ₹{Number(watch('servicePrice') || 0).toFixed(2)}</p></CardContent></Card>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2"><Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>{reviewing ? <><Button type="button" variant="outline" className="flex-1" onClick={() => { setReviewing(false); setReviewPayload(null); }}>Edit details</Button><Button type="button" className="flex-1" disabled={loading || !worker || !reviewPayload} onClick={onConfirm}>{loading ? 'Submitting…' : 'Confirm and submit'}</Button></> : <Button type="submit" className="flex-1" disabled={!worker || !categoriesQuery.isSuccess || visibleWorkerSkills.length === 0}>Review booking</Button>}</div>
          </form>
        </CardContent></Card>
      </div>
    </CustomerLayout>
  );
}
