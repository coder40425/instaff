import prisma from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { releaseWorkerAvailabilityIfIdle } from "../matching/assignment.service";
import {
  cancelBookingWithRole,
  includeBookingCancellationMetadata,
} from "./cancellation.service";
import type { CreateBookingInput } from "./booking.validation";

// ── Wallet credit helper ──────────────────────────────────────────────────────
// Called ONLY when worker confirms "Payment Received" — not on completion.

async function creditWorkerWallet(tx: Prisma.TransactionClient, workerId: string, bookingId: string, amount: number) {
  const workerProfile = await tx.workerProfile.findUnique({
    where: { userId: workerId },
    select: { id: true },
  });
  if (!workerProfile) throw new Error("Worker wallet is unavailable");

  const wallet = await tx.workerWallet.upsert({
    where: { workerProfileId: workerProfile.id },
    create: { workerProfileId: workerProfile.id },
    update: {},
  });

  await tx.workerWallet.update({
    where: { id: wallet.id },
    data: {
      pendingBalance:   { increment: amount },
      lifetimeEarnings: { increment: amount },
    },
  });

  await tx.walletTransaction.create({
    data: {
      walletId:    wallet.id,
      type:        "CREDIT",
      amount,
      description: "Payment received from customer",
      bookingId,
    },
  });
}

type VisitInput = { scheduledDate: string; durationMinutes: number };

const calendarParts = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid calendar date");
  const [, year, month, day] = match;
  const parts = { year: Number(year), month: Number(month), day: Number(day) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() !== parts.month - 1 || date.getUTCDate() !== parts.day) {
    throw new Error("Enter a valid calendar date");
  }
  return parts;
};

const zonedDateTime = (date: string, time: string, timeZone: string): Date => {
  const { year, month, day } = calendarParts(date);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  let instant = desiredUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const representedUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const difference = desiredUtc - representedUtc;
    instant += difference;
    if (difference === 0) break;
  }
  const result = new Date(instant);
  const check = Object.fromEntries(formatter.formatToParts(result).map((part) => [part.type, part.value]));
  if (
    Number(check.year) !== year || Number(check.month) !== month || Number(check.day) !== day ||
    Number(check.hour) !== hour || Number(check.minute) !== minute
  ) throw new Error("That local time does not exist in the selected time zone");
  return result;
};

const generateRecurringVisits = (format: "WEEKLY" | "MONTHLY", schedule: NonNullable<CreateBookingInput["schedule"]>, allowPastStart = false): VisitInput[] => {
  const start = calendarParts(schedule.startDate);
  const end = schedule.endDate ? calendarParts(schedule.endDate) : undefined;
  if (end && Date.UTC(end.year, end.month - 1, end.day) < Date.UTC(start.year, start.month - 1, start.day)) {
    throw new Error("End date must be on or after the start date");
  }
  let timeZone: string;
  try {
    timeZone = new Intl.DateTimeFormat("en-US", { timeZone: schedule.timeZone }).resolvedOptions().timeZone;
  } catch {
    throw new Error("Choose a valid time zone");
  }
  const localToday = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  if (!allowPastStart && Date.UTC(start.year, start.month - 1, start.day) < Date.UTC(Number(localToday.year), Number(localToday.month) - 1, Number(localToday.day))) {
    throw new Error("Start date cannot be in the past");
  }

  const visits: VisitInput[] = [];
  const add = (year: number, month: number, day: number) => {
    const date = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    visits.push({ scheduledDate: zonedDateTime(date, schedule.visitTime, timeZone).toISOString(), durationMinutes: schedule.durationMinutes });
  };

  if (format === "WEEKLY") {
    const startDate = new Date(Date.UTC(start.year, start.month - 1, start.day));
    const offset = (schedule.weekday! - startDate.getUTCDay() + 7) % 7;
    let cursor = new Date(startDate.getTime() + offset * 86400000);
    while (true) {
      const current = { year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1, day: cursor.getUTCDate() };
      if (end && Date.UTC(current.year, current.month - 1, current.day) > Date.UTC(end.year, end.month - 1, end.day)) break;
      add(current.year, current.month, current.day);
      if (schedule.occurrenceCount && visits.length >= schedule.occurrenceCount) break;
      if (visits.length >= 100) throw new Error("A recurring booking can have at most 100 visits");
      cursor = new Date(cursor.getTime() + 7 * 86400000);
    }
  } else {
    let year = start.year;
    let month = start.month;
    while (true) {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const day = Math.min(schedule.dayOfMonth!, lastDay);
      const dateValue = Date.UTC(year, month - 1, day);
      if (dateValue >= Date.UTC(start.year, start.month - 1, start.day)) {
        if (end && dateValue > Date.UTC(end.year, end.month - 1, end.day)) break;
        add(year, month, day);
        if (schedule.occurrenceCount && visits.length >= schedule.occurrenceCount) break;
      }
      if (visits.length >= 100) throw new Error("A recurring booking can have at most 100 visits");
      month += 1;
      if (month > 12) { year += 1; month = 1; }
      if (year - start.year > 10) break;
    }
  }
  if (visits.length === 0) throw new Error("The selected recurrence produces no visits");
  return visits;
};

const validateVisitList = (visits: VisitInput[], allowPast = false) => {
  const now = Date.now();
  const seen = new Set<number>();
  return visits.map((visit) => {
    const scheduled = new Date(visit.scheduledDate);
    if (!Number.isFinite(scheduled.getTime())) throw new Error("Enter a valid visit date and time");
    if (!allowPast && scheduled.getTime() < now) throw new Error("Visit dates cannot be in the past");
    if (!Number.isInteger(visit.durationMinutes) || visit.durationMinutes <= 0) {
      throw new Error("Visit duration must be a positive number of minutes");
    }
    if (seen.has(scheduled.getTime())) throw new Error("Visit dates and times must be unique");
    seen.add(scheduled.getTime());
    return { scheduledDate: scheduled, durationMinutes: visit.durationMinutes };
  }).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
};

// ── Booking functions ─────────────────────────────────────────────────────────

export const createBooking = async (customerId: string, data: CreateBookingInput) => {
  const customer = await prisma.user.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");

  const requestVisits = data.serviceFormat === "MULTIPLE_VISITS"
    ? validateVisitList(data.visits ?? [], true)
    : data.serviceFormat === "WEEKLY" || data.serviceFormat === "MONTHLY"
      ? validateVisitList(generateRecurringVisits(data.serviceFormat, data.schedule!, Boolean(data.requestId)), true)
      : validateVisitList([{ scheduledDate: data.scheduledDate!, durationMinutes: data.durationMinutes! }], true);

  const matchesRequest = (booking: { customerId: string; workerId: string; bookingType: string; subCategoryId: string; address: string; city: string; scheduledDate: Date; durationMinutes: number; servicePrice: number | null; notes: string | null; serviceFormat: string; visits: { scheduledDate: Date; durationMinutes: number }[] }) =>
    booking.customerId === customerId &&
    booking.workerId === data.workerId &&
    booking.bookingType === data.bookingType &&
    booking.subCategoryId === data.subCategoryId &&
    booking.address === data.address &&
    booking.city === data.city &&
    booking.serviceFormat === data.serviceFormat &&
    booking.scheduledDate.getTime() === requestVisits[0].scheduledDate.getTime() &&
    booking.durationMinutes === requestVisits[0].durationMinutes &&
    booking.servicePrice === data.servicePrice &&
    (booking.notes ?? undefined) === data.notes &&
    booking.visits.length === (["MULTIPLE_VISITS", "WEEKLY", "MONTHLY"].includes(data.serviceFormat) ? requestVisits.length : 0) &&
    booking.visits.every((visit, index) => visit.scheduledDate.getTime() === requestVisits[index].scheduledDate.getTime() && visit.durationMinutes === requestVisits[index].durationMinutes);

  if (data.requestId) {
    const prior = await prisma.booking.findUnique({ where: { id: data.requestId }, include: { visits: { orderBy: { sequence: "asc" } } } });
    if (prior) {
      if (matchesRequest(prior)) return prior;
      throw new Error("This request ID was already used for a different booking. Refresh the form and try again.");
    }
  }

  // Existing IDs are allowed to match their original past schedule on retry; new bookings still require a future start date.
  if (data.requestId && (data.serviceFormat === "WEEKLY" || data.serviceFormat === "MONTHLY")) {
    generateRecurringVisits(data.serviceFormat, data.schedule!);
  }

  const worker = await prisma.workerProfile.findUnique({
    where: { userId: data.workerId },
    include: { user: true, skills: { include: { subCategory: true } } },
  });

  if (!worker)            throw new Error("Worker not found");
  if (!worker.isVerified)  throw new Error("Worker not verified");
  if (worker.isSuspended)  throw new Error("Worker suspended");
  if (!worker.isAvailable) throw new Error("Worker unavailable");

  const hasSkill = worker.skills.some((s) => s.subCategoryId === data.subCategoryId);
  if (!hasSkill) throw new Error("Worker does not offer this service");

  const subCategory = await prisma.subCategory.findUnique({
    where: { id: data.subCategoryId },
    include: { category: true },
  });
  if (!subCategory) throw new Error("Service category not found");
  if (!subCategory.isVisible || !subCategory.category.isVisible) {
    throw new Error("This service is not currently available");
  }

  const visits = requestVisits;
  if (visits.some((visit) => visit.scheduledDate.getTime() < Date.now())) {
    throw new Error("Visit dates cannot be in the past");
  }

  const firstVisit = visits[0];
  if (!firstVisit) throw new Error("At least one valid visit is required");

  try {
    return await prisma.$transaction(async (tx) => tx.booking.create({
    data: {
      ...(data.requestId ? { id: data.requestId } : {}),
      customerId,
      workerId:        data.workerId,
      customerName:    customer.name,
      customerPhone:   customer.phone,
      workerName:      worker.user.name,
      workerPhone:     worker.user.phone,
      bookingType:     data.bookingType,
      subCategoryId:   data.subCategoryId,
      address:         data.address,
      city:            data.city,
      scheduledDate:   firstVisit.scheduledDate,
      durationMinutes: firstVisit.durationMinutes,
      servicePrice:    data.servicePrice,
      notes:           data.notes,
      serviceFormat:   data.serviceFormat,
      ...(data.serviceFormat === "MULTIPLE_VISITS" || data.serviceFormat === "WEEKLY" || data.serviceFormat === "MONTHLY"
        ? { visits: { create: visits.map((visit, index) => ({ ...visit, sequence: index + 1 })) } }
        : {}),
    },
    include: { visits: { orderBy: { sequence: "asc" } } },
    }));
  } catch (error) {
    if (data.requestId) {
      const prior = await prisma.booking.findUnique({ where: { id: data.requestId }, include: { visits: { orderBy: { sequence: "asc" } } } });
      if (prior && matchesRequest(prior)) return prior;
    }
    throw error;
  }
};

export const getCustomerBookings = async (customerId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { customerId },
    include: {
      subCategory: { include: { category: true } },
      visits: { orderBy: { sequence: "asc" } },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return bookings.map(includeBookingCancellationMetadata);
};

export const getWorkerBookings = async (workerId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { workerId },
    include: {
      subCategory: { include: { category: true } },
      visits: { orderBy: { sequence: "asc" } },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return bookings.map(includeBookingCancellationMetadata);
};

export const getBookingById = async (bookingId: string, userId: string, role: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { subCategory: { include: { category: true } }, visits: { orderBy: { sequence: "asc" } } },
  });
  if (!booking) throw new Error("Booking not found");
  if (role !== "ADMIN" && booking.customerId !== userId && booking.workerId !== userId) {
    const error = new Error("You are not authorized to view this booking") as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }
  return includeBookingCancellationMetadata(booking);
};

export const acceptBooking = async (bookingId: string, workerId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                     throw new Error("Booking not found");
  if (booking.workerId !== workerId) throw new Error("Unauthorized");
  if (booking.status !== "PENDING") throw new Error("Booking already processed");

  const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: workerId } });
  if (!workerProfile?.isAvailable) throw new Error("Worker unavailable");
  if (!workerProfile.isVerified)   throw new Error("Worker not verified");
  if (workerProfile.isSuspended)   throw new Error("Worker suspended");

  return prisma.$transaction(async (tx) => {
    const availabilityClaim = await tx.workerProfile.updateMany({
      where: {
        id: workerProfile.id,
        isAvailable: true,
        isVerified: true,
        isSuspended: false,
      },
      data: { isAvailable: false },
    });
    if (availabilityClaim.count !== 1) {
      throw new Error("Worker unavailable");
    }

    const [activeBooking, activeRequirementAssignment] = await Promise.all([
      tx.booking.findFirst({
        where: {
          workerId,
          id: { not: bookingId },
          status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        },
        select: { id: true },
      }),
      tx.requirementCandidate.findFirst({
        where: {
          workerProfileId: workerProfile.id,
          status: "ASSIGNED",
          replacementRequestsCurrent: { none: { status: "RESOLVED" } },
          requirement: { status: { in: ["OPEN", "MATCHING", "FILLED"] } },
        },
        select: { id: true },
      }),
    ]);
    if (activeBooking || activeRequirementAssignment) {
      throw new Error("Worker already has an active assignment");
    }

    const accepted = await tx.booking.updateMany({
      where: { id: bookingId, workerId, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (accepted.count !== 1) {
      throw new Error("Booking already processed");
    }

    return tx.booking.findUnique({ where: { id: bookingId } });
  });
};

export const rejectBooking = async (bookingId: string, workerId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                     throw new Error("Booking not found");
  if (booking.workerId !== workerId) throw new Error("Unauthorized");
  if (booking.status !== "PENDING") throw new Error("Booking already processed");

  return prisma.$transaction(async (tx) => {
    const rejected = await tx.booking.updateMany({
      where: { id: bookingId, workerId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    if (rejected.count !== 1) throw new Error("Booking already processed");
    await tx.bookingVisit.updateMany({
      where: { bookingId, status: "SCHEDULED" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Parent booking was rejected" },
    });
    return tx.booking.findUnique({ where: { id: bookingId }, include: { visits: { orderBy: { sequence: "asc" } } } });
  });
};

export const customerStartBooking = async (bookingId: string, customerId: string, visitId?: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                          throw new Error("Booking not found");
  if (booking.customerId !== customerId)  throw new Error("Unauthorized");

  if (["MULTIPLE_VISITS", "WEEKLY", "MONTHLY"].includes(booking.serviceFormat)) {
    if (!visitId) throw new Error("Choose the visit to start");
    if (booking.status !== "ACCEPTED" && booking.status !== "IN_PROGRESS") {
      throw new Error("Booking must be accepted before a visit can start");
    }
    return prisma.$transaction(async (tx) => {
      const startedVisit = await tx.bookingVisit.updateMany({
        where: { id: visitId, bookingId, status: "SCHEDULED" },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
      if (startedVisit.count !== 1) throw new Error("Visit is not available to start");

      const startedParent = await tx.booking.updateMany({
        where: { id: bookingId, customerId, status: "ACCEPTED" },
        data: { status: "IN_PROGRESS", startedAt: new Date(), startedByCustomer: true },
      });
      if (startedParent.count !== 1) {
        const current = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
        if (current?.status !== "IN_PROGRESS") throw new Error("Booking must be accepted before a visit can start");
      }
      return tx.booking.findUnique({ where: { id: bookingId }, include: { visits: { orderBy: { sequence: "asc" } } } });
    });
  }

  if (visitId) throw new Error("This booking does not have separate visits");
  if (booking.status !== "ACCEPTED")     throw new Error("Booking must be ACCEPTED");

  return prisma.booking.update({
    where: { id: bookingId },
    data:  { status: "IN_PROGRESS", startedAt: new Date(), startedByCustomer: true },
  });
};

export const completeBooking = async (bookingId: string, customerId: string, visitId?: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                          throw new Error("Booking not found");
  if (booking.customerId !== customerId)  throw new Error("Only customer can complete booking");

  if (["MULTIPLE_VISITS", "WEEKLY", "MONTHLY"].includes(booking.serviceFormat)) {
    if (!visitId) throw new Error("Choose the visit to complete");
    if (booking.status !== "IN_PROGRESS") throw new Error("Booking must be IN_PROGRESS");
    return prisma.$transaction(async (tx) => {
      // Touch the parent row first so concurrent last-visit completions serialize.
      const parentLock = await tx.booking.updateMany({
        where: { id: bookingId, customerId, status: "IN_PROGRESS" },
        data: { updatedAt: new Date() },
      });
      if (parentLock.count !== 1) throw new Error("Booking must be IN_PROGRESS");

      const completedVisit = await tx.bookingVisit.updateMany({
        where: { id: visitId, bookingId, status: "IN_PROGRESS" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (completedVisit.count !== 1) throw new Error("Visit must be in progress before it can be completed");

      const remaining = await tx.bookingVisit.count({ where: { bookingId, status: { not: "COMPLETED" } } });
      if (remaining === 0) {
        const completedParent = await tx.booking.updateMany({
          where: { id: bookingId, customerId, status: "IN_PROGRESS" },
          data: { status: "COMPLETED", completedAt: new Date(), completedByCustomer: true },
        });
        if (completedParent.count !== 1) throw new Error("Booking must be IN_PROGRESS");
        await releaseWorkerAvailabilityIfIdle(tx, booking.workerId);
      }
      return tx.booking.findUnique({ where: { id: bookingId }, include: { visits: { orderBy: { sequence: "asc" } } } });
    });
  }

  if (visitId) throw new Error("This booking does not have separate visits");
  if (booking.status !== "IN_PROGRESS")  throw new Error("Booking must be IN_PROGRESS");

  return prisma.$transaction(async (tx) => {
    const completed = await tx.booking.updateMany({
      where: {
        id: bookingId,
        customerId,
        status: "IN_PROGRESS",
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedByCustomer: true,
      },
    });
    if (completed.count !== 1) {
      throw new Error("Booking must be IN_PROGRESS");
    }
    await releaseWorkerAvailabilityIfIdle(tx, booking.workerId);
    return tx.booking.findUnique({ where: { id: bookingId } });
  });
  // NOTE: wallet is NOT credited here — worker must confirm payment received
};

// ── Worker confirms customer has paid via UPI ─────────────────────────────────

export const confirmPaymentReceived = async (bookingId: string, workerId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                      throw new Error("Booking not found");
  if (booking.workerId !== workerId)  throw new Error("Unauthorized");
  if (booking.status !== "COMPLETED") throw new Error("Booking must be COMPLETED first");
  if (booking.isPaidByCustomer)       throw new Error("Payment already confirmed");

  const amount = Number(booking.workerPayout) || Number(booking.servicePrice) || 0;
  if (amount <= 0) throw new Error("No payment amount set for this booking");

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.booking.updateMany({
      where: { id: bookingId, workerId, status: "COMPLETED", isPaidByCustomer: false },
      data: { isPaidByCustomer: true, paidByCustomerAt: new Date(), paymentStatus: "PAID" },
    });
    if (claimed.count !== 1) throw new Error("Payment already confirmed");
    await creditWorkerWallet(tx, workerId, bookingId, amount);
    return tx.booking.findUnique({ where: { id: bookingId } });
  });
};

export const cancelBooking = (
  bookingId: string,
  customerId: string,
  reason: unknown
) =>
  cancelBookingWithRole(
    bookingId,
    { role: "CUSTOMER", userId: customerId },
    reason
  );

export const cancelWorkerBooking = (
  bookingId: string,
  workerId: string,
  reason: unknown
) =>
  cancelBookingWithRole(
    bookingId,
    { role: "WORKER", userId: workerId },
    reason
  );

export const markBookingPaid = async (bookingId: string, customerId: string, paymentMethod: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                          throw new Error("Booking not found");
  if (booking.customerId !== customerId)  throw new Error("Unauthorized");

  return prisma.booking.update({
    where: { id: bookingId },
    data:  { paymentStatus: "PAID", paymentMethod },
  });
};

export const requestReplacement = async (
  bookingId: string,
  customerId: string,
  reason: string
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.customerId !== customerId) {
    throw new Error("Unauthorized");
  }

  if (
    booking.status !== "NO_SHOW" &&
    booking.status !== "ACCEPTED"
  ) {
    throw new Error("Replacement not allowed for this booking");
  }

  if (booking.replacementRequested) {
    throw new Error("Replacement already requested");
  }

  if (!reason || reason.trim().length < 3) {
    throw new Error("Replacement reason is required");
  }

  return prisma.booking.update({
    where: { id: bookingId },

    data: {
      replacementRequested: true,
      replacementReason: reason.trim(),
    },

    include: {
      subCategory: {
        include: {
          category: true,
        },
      },
    },
  });
};

export const markNoShow = async (bookingId: string, customerId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking)                          throw new Error("Booking not found");
  if (booking.customerId !== customerId)  throw new Error("Unauthorized");
  if (booking.status !== "ACCEPTED") throw new Error("Only accepted bookings can be marked no-show");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, customerId, status: "ACCEPTED" },
      data: { status: "NO_SHOW" },
    });
    if (updated.count !== 1) throw new Error("Only accepted bookings can be marked no-show");
    await tx.bookingVisit.updateMany({
      where: { bookingId, status: "SCHEDULED" },
      data: { status: "NO_SHOW" },
    });
    await releaseWorkerAvailabilityIfIdle(tx, booking.workerId);
    return tx.booking.findUnique({ where: { id: bookingId } });
  });
};
