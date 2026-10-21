import prisma from "../../config/prisma";
import { releaseWorkerAvailabilityIfIdle } from "../matching/assignment.service";

export type BookingCancellationRole = "CUSTOMER" | "WORKER" | "ADMIN";

type BookingCancellationActor = {
  role: BookingCancellationRole;
  userId?: string;
};

type BookingCancellationMetadata = {
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
};

export const includeBookingCancellationMetadata = <T extends BookingCancellationMetadata>(
  booking: T
) => ({
  ...booking,
  cancelledAt: booking.cancelledAt ?? null,
  cancellationReason: booking.cancellationReason ?? null,
  cancelledBy: booking.cancelledBy ?? null,
});

export class BookingCancellationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "BookingCancellationError";
  }
}

const normalizeCancellationReason = (reason: unknown) => {
  if (typeof reason !== "string" || !reason.trim()) {
    throw new BookingCancellationError(
      "A cancellation reason is required",
      400
    );
  }

  return reason.trim();
};

const assertCancellationAllowed = (
  booking: { customerId: string; workerId: string; status: string },
  actor: BookingCancellationActor
) => {
  if (actor.role === "CUSTOMER" && booking.customerId !== actor.userId) {
    throw new BookingCancellationError(
      "You are not authorized to cancel this booking",
      403
    );
  }

  if (actor.role === "WORKER" && booking.workerId !== actor.userId) {
    throw new BookingCancellationError(
      "You are not authorized to cancel this booking",
      403
    );
  }

  if (booking.status === "CANCELLED") {
    throw new BookingCancellationError("Booking is already cancelled", 409);
  }

  if (booking.status === "COMPLETED") {
    throw new BookingCancellationError(
      "Completed bookings cannot be cancelled",
      409
    );
  }

  if (actor.role === "WORKER" && booking.status !== "ACCEPTED") {
    throw new BookingCancellationError(
      booking.status === "PENDING"
        ? "Pending bookings must be rejected, not cancelled"
        : "Workers can cancel only accepted bookings",
      409
    );
  }
};

export const cancelBookingWithRole = async (
  bookingId: string,
  actor: BookingCancellationActor,
  reason: unknown
) => {
  const cancellationReason = normalizeCancellationReason(reason);

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingCancellationError("Booking not found", 404);
    }

    assertCancellationAllowed(booking, actor);

    const cancelled = await tx.booking.updateMany({
      where: {
        id: bookingId,
        ...(actor.role === "CUSTOMER" ? { customerId: actor.userId } : {}),
        ...(actor.role === "WORKER" ? { workerId: actor.userId } : {}),
        status:
          actor.role === "WORKER"
            ? "ACCEPTED"
            : { notIn: ["COMPLETED", "CANCELLED"] },
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason,
        cancelledBy: actor.role,
      },
    });

    if (cancelled.count !== 1) {
      const currentBooking = await tx.booking.findUnique({
        where: { id: bookingId },
      });
      if (!currentBooking) {
        throw new BookingCancellationError("Booking not found", 404);
      }

      assertCancellationAllowed(currentBooking, actor);
      throw new BookingCancellationError(
        "Booking status changed before cancellation completed. Refresh and try again.",
        409
      );
    }

    await releaseWorkerAvailabilityIfIdle(tx, booking.workerId);
    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
};
